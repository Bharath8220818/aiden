"""Project CRUD tests (Phase 1.7) — authenticated (Phase 2 enforcement)."""

from __future__ import annotations

import uuid

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.models import UserRole
from tests.helpers import seed_user


async def _owner(db_session: AsyncSession) -> dict[str, str]:
    """Fresh engineer + Bearer headers; workspace creation makes them owner."""
    user = await seed_user(db_session, role=UserRole.engineer)
    return {"Authorization": f"Bearer {create_access_token(str(user.id))}"}


async def _create_workspace(client: AsyncClient, headers: dict, name: str = "Proj WS") -> dict:
    resp = await client.post("/api/v1/workspaces", json={"name": name}, headers=headers)
    assert resp.status_code == 201
    return resp.json()


async def test_create_project(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _owner(db_session)
    ws = await _create_workspace(client, headers)
    resp = await client.post(
        "/api/v1/projects",
        json={"workspace_id": ws["id"], "name": "Orders CDC", "description": "CDC into Snowflake"},
        headers=headers,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Orders CDC"
    assert body["workspace_id"] == ws["id"]
    assert body["status"] == "active"


async def test_create_project_missing_workspace_returns_404(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    headers = await _owner(db_session)
    resp = await client.post(
        "/api/v1/projects",
        json={"workspace_id": str(uuid.uuid4()), "name": "Orphan"},
        headers=headers,
    )
    assert resp.status_code == 404


async def test_list_projects_filtered_by_workspace(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _owner(db_session)
    ws_a = await _create_workspace(client, headers, "WS A")
    ws_b = await _create_workspace(client, headers, "WS B")
    await client.post("/api/v1/projects", json={"workspace_id": ws_a["id"], "name": "P-A1"}, headers=headers)
    await client.post("/api/v1/projects", json={"workspace_id": ws_a["id"], "name": "P-A2"}, headers=headers)
    await client.post("/api/v1/projects", json={"workspace_id": ws_b["id"], "name": "P-B1"}, headers=headers)

    resp = await client.get("/api/v1/projects", params={"workspace_id": ws_a["id"]}, headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 2
    assert {item["name"] for item in body["items"]} == {"P-A1", "P-A2"}

    all_resp = await client.get("/api/v1/projects", headers=headers)
    assert all_resp.json()["total"] == 3


async def test_get_update_delete_project(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _owner(db_session)
    ws = await _create_workspace(client, headers)
    project = (
        await client.post(
            "/api/v1/projects",
            json={"workspace_id": ws["id"], "name": "Inventory"},
            headers=headers,
        )
    ).json()
    project_id = project["id"]

    got = await client.get(f"/api/v1/projects/{project_id}", headers=headers)
    assert got.status_code == 200
    assert got.json()["name"] == "Inventory"
    assert got.json()["pipeline_count"] == 0

    updated = await client.put(
        f"/api/v1/projects/{project_id}",
        json={"description": "archived project", "status": "archived"},
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "archived"
    assert updated.json()["description"] == "archived project"

    deleted = await client.delete(f"/api/v1/projects/{project_id}", headers=headers)
    assert deleted.status_code == 204

    missing = await client.get(f"/api/v1/projects/{project_id}", headers=headers)
    assert missing.status_code == 404


async def test_validation_error_envelope(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _owner(db_session)
    resp = await client.post("/api/v1/projects", json={"name": "No workspace"}, headers=headers)
    assert resp.status_code == 422
    body = resp.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert "message" in body


async def test_delete_workspace_cascades_projects(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _owner(db_session)
    ws = await _create_workspace(client, headers, "Cascade WS")
    project = (
        await client.post(
            "/api/v1/projects",
            json={"workspace_id": ws["id"], "name": "Child"},
            headers=headers,
        )
    ).json()

    deleted = await client.delete(f"/api/v1/workspaces/{ws['id']}", headers=headers)
    assert deleted.status_code == 204

    missing = await client.get(f"/api/v1/projects/{project['id']}", headers=headers)
    assert missing.status_code == 404
