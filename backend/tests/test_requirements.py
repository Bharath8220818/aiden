"""Requirement CRUD + contract tests (1.7 API, 1.9 data) — authenticated."""

from __future__ import annotations

import uuid

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.models import (
    Project,
    User,
    UserRole,
    Workspace,
    WorkspaceMember,
    WorkspaceRole,
)
from tests.helpers import seed_user


async def _seed_project(db: AsyncSession) -> tuple[User, Project]:
    """Owner (lead system role, workspace owner) + their project."""
    owner = await seed_user(db, role=UserRole.lead)
    ws = Workspace(name=f"Req WS {uuid.uuid4().hex[:8]}", slug=f"req-ws-{uuid.uuid4().hex[:12]}")
    db.add(ws)
    await db.flush()
    db.add(WorkspaceMember(workspace_id=ws.id, user_id=owner.id, role=WorkspaceRole.owner))
    await db.flush()
    project = Project(workspace_id=ws.id, name="Req Project", created_by=owner.id)
    db.add(project)
    await db.commit()
    return owner, project


def _auth(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user.id))}"}


async def test_create_requirement(client: httpx.AsyncClient, db_session: AsyncSession) -> None:
    owner, project = await _seed_project(db_session)

    r = await client.post(
        "/api/v1/requirements",
        json={"project_id": str(project.id), "title": "Orders CDC", "description": "15 min SLA"},
        headers=_auth(owner),
    )
    assert r.status_code == 201
    body = r.json()
    assert body["title"] == "Orders CDC"
    assert body["project_id"] == str(project.id)
    assert body["status"] == "draft"
    assert body["id"]


async def test_list_and_get_requirement(client: httpx.AsyncClient, db_session: AsyncSession) -> None:
    owner, project = await _seed_project(db_session)
    headers = _auth(owner)
    await client.post(
        "/api/v1/requirements",
        json={"project_id": str(project.id), "title": "Req A"},
        headers=headers,
    )

    listed = await client.get(f"/api/v1/requirements?project_id={project.id}", headers=headers)
    assert listed.status_code == 200
    assert listed.json()["total"] == 1

    r = await client.post(
        "/api/v1/requirements",
        json={"project_id": str(project.id), "title": "Req B"},
        headers=headers,
    )
    req_id = r.json()["id"]
    got = await client.get(f"/api/v1/requirements/{req_id}", headers=headers)
    assert got.status_code == 200
    assert got.json()["title"] == "Req B"


async def test_update_requirement(client: httpx.AsyncClient, db_session: AsyncSession) -> None:
    owner, project = await _seed_project(db_session)
    headers = _auth(owner)
    r = await client.post(
        "/api/v1/requirements",
        json={"project_id": str(project.id), "title": "Old"},
        headers=headers,
    )
    req_id = r.json()["id"]

    updated = await client.put(
        f"/api/v1/requirements/{req_id}",
        json={"title": "New Title", "status": "validated"},
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "New Title"
    assert updated.json()["status"] == "validated"


async def test_save_contract_endpoint(client: httpx.AsyncClient, db_session: AsyncSession) -> None:
    owner, project = await _seed_project(db_session)
    headers = _auth(owner)
    r = await client.post(
        "/api/v1/requirements",
        json={"project_id": str(project.id), "title": "Contract"},
        headers=headers,
    )
    req_id = r.json()["id"]

    saved = await client.post(
        f"/api/v1/requirements/{req_id}/contract",
        json={
            "intent_analysis": {"pattern": "streaming_cdc", "confidence": 0.96},
            "data_contract": {"name": "orders_contract", "version": "1.0.0"},
        },
        headers=headers,
    )
    assert saved.status_code == 200
    body = saved.json()
    assert body["status"] == "validated"
    assert body["intent_analysis"]["pattern"] == "streaming_cdc"
    assert body["data_contract"]["version"] == "1.0.0"


async def test_delete_requirement(client: httpx.AsyncClient, db_session: AsyncSession) -> None:
    owner, project = await _seed_project(db_session)
    headers = _auth(owner)
    r = await client.post(
        "/api/v1/requirements",
        json={"project_id": str(project.id), "title": "Doomed"},
        headers=headers,
    )
    req_id = r.json()["id"]

    deleted = await client.delete(f"/api/v1/requirements/{req_id}", headers=headers)
    assert deleted.status_code == 204
    got = await client.get(f"/api/v1/requirements/{req_id}", headers=headers)
    assert got.status_code == 404
    assert got.json()["error"]["code"] == "NOT_FOUND"


async def test_requirement_invalid_data(client: httpx.AsyncClient, db_session: AsyncSession) -> None:
    owner, _ = await _seed_project(db_session)
    headers = _auth(owner)

    # non-existent project → 404 (invalid FK target handled cleanly)
    r = await client.post(
        "/api/v1/requirements",
        json={"project_id": str(uuid.uuid4()), "title": "Orphan"},
        headers=headers,
    )
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "NOT_FOUND"

    # missing project_id → 422
    r2 = await client.post("/api/v1/requirements", json={"title": "No project"}, headers=headers)
    assert r2.status_code == 422
    # empty title → 422
    r3 = await client.post(
        "/api/v1/requirements",
        json={"project_id": str(uuid.uuid4()), "title": ""},
        headers=headers,
    )
    assert r3.status_code == 422


async def test_gate_flow_create_user_ws_project_requirement(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    """Mirrors the Phase 1 GATE (authenticated): User → WS → Member → Project → Requirement."""
    headers = _auth(await seed_user(db_session, role=UserRole.lead))

    # User (self-registration — open by design)
    u = await client.post(
        "/api/v1/users/register",
        json={"email": "gate@acmedata.io", "password": "gate123", "full_name": "Gate"},
    )
    assert u.status_code == 201
    user_id = u.json()["id"]

    # Workspace (creator becomes owner)
    ws = await client.post("/api/v1/workspaces", json={"name": "Gate Platform"}, headers=headers)
    assert ws.status_code == 201
    ws_id = ws.json()["id"]

    # Member
    member = await client.post(
        f"/api/v1/workspaces/{ws_id}/members",
        json={"user_id": user_id, "role": "owner"},
        headers=headers,
    )
    assert member.status_code == 201
    assert member.json()["user_email"] == "gate@acmedata.io"

    # Project
    project = await client.post(
        "/api/v1/projects", json={"workspace_id": ws_id, "name": "Gate Pipeline"}, headers=headers
    )
    assert project.status_code == 201
    project_id = project.json()["id"]

    # Requirement → persisted → read back via API
    req = await client.post(
        "/api/v1/requirements",
        json={"project_id": project_id, "title": "Gate Contract", "description": "GATE"},
        headers=headers,
    )
    assert req.status_code == 201
    req_id = req.json()["id"]

    fetched = await client.get(f"/api/v1/requirements/{req_id}", headers=headers)
    assert fetched.status_code == 200
    body = fetched.json()
    assert body["title"] == "Gate Contract"
    assert body["project_id"] == project_id
    assert body["description"] == "GATE"
