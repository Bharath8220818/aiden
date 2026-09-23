"""Architecture blueprint contract tests.

The GET /architecture/blueprint endpoint must always return React Flow-shaped
nodes ({"id", "position", "data": {...}}), even when the stored blueprint row
contains legacy flat nodes ({"id", "kind", "label", "technology"}). A flat node
passing through unconverted crashes the canvas client with
"Cannot read properties of undefined (reading 'kind')".
"""

from __future__ import annotations

import uuid

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.models import Architecture, Project, User, UserRole, Workspace, WorkspaceMember, WorkspaceRole
from tests.helpers import seed_user


def _auth(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user.id))}"}


async def _seed_project_with_blueprint(
    db: AsyncSession, *, blueprint: dict
) -> User:
    lead = await seed_user(db, role=UserRole.lead)
    ws = Workspace(name=f"WS {uuid.uuid4().hex[:6]}", slug=f"ws-{uuid.uuid4().hex[:10]}")
    db.add(ws)
    await db.flush()
    db.add(WorkspaceMember(workspace_id=ws.id, user_id=lead.id, role=WorkspaceRole.owner))
    project = Project(workspace_id=ws.id, name=f"Arch {uuid.uuid4().hex[:6]}", created_by=lead.id)
    db.add(project)
    await db.flush()
    db.add(
        Architecture(
            project_id=project.id,
            name="Orders CDC Blueprint",
            description="test fixture",
            blueprint=blueprint,
            status="validated",
            generated_from="test",
            created_by=lead.id,
        )
    )
    await db.commit()
    return lead


async def test_blueprint_normalizes_legacy_flat_nodes(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    """The exact shape the dev database contained — must not 500 or pass through."""
    legacy = {
        "nodes": [
            {"id": "n1", "kind": "source", "label": "PostgreSQL", "technology": "postgresql"},
            {"id": "n2", "kind": "sink", "label": "Snowflake", "technology": "snowflake"},
        ],
        "edges": [{"source": "n1", "target": "n2"}],
    }
    lead = await _seed_project_with_blueprint(db_session, blueprint=legacy)

    resp = await client.get("/api/v1/architecture/blueprint", headers=_auth(lead))
    assert resp.status_code == 200
    body = resp.json()
    assert body["nodes"], "nodes must not be dropped"
    for node in body["nodes"]:
        assert node["data"]["kind"] in {
            "source", "ingestion", "processing", "storage", "quality", "sink", "orchestration",
        }
        assert node["data"]["label"]
        assert isinstance(node["position"], dict)
        assert "x" in node["position"] and "y" in node["position"]
    assert [e["source"] for e in body["edges"]] == ["n1"]
    assert [e["target"] for e in body["edges"]] == ["n2"]


async def test_blueprint_passthrough_flow_shaped_nodes(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    """Already-flow-shaped blueprints are served untouched (labels preserved)."""
    flow = {
        "nodes": [
            {
                "id": "a",
                "type": "architecture",
                "position": {"x": 10, "y": 20},
                "data": {"label": "PG", "kind": "source", "status": "idle", "technology": "PostgreSQL 15"},
            },
            {
                "id": "b",
                "type": "architecture",
                "position": {"x": 100, "y": 20},
                "data": {"label": "Mart", "kind": "sink", "status": "idle", "technology": "Snowflake"},
            },
        ],
        "edges": [{"id": "e1", "source": "a", "target": "b", "animated": True}],
    }
    lead = await _seed_project_with_blueprint(db_session, blueprint=flow)

    resp = await client.get("/api/v1/architecture/blueprint", headers=_auth(lead))
    assert resp.status_code == 200
    body = resp.json()
    assert [n["data"]["label"] for n in body["nodes"]] == ["PG", "Mart"]
    assert body["edges"][0]["animated"] is True


async def test_blueprint_404_when_none_saved(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    lead = await seed_user(db_session, role=UserRole.lead)
    resp = await client.get("/api/v1/architecture/blueprint", headers=_auth(lead))
    assert resp.status_code == 404
