"""Workspace chat tests — intent detection, artifacts, context, task actions."""

from __future__ import annotations

import uuid

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.workspace import detect_intent
from app.core.security import create_access_token
from app.models import Project, Task, User, UserRole, Workspace, WorkspaceMember, WorkspaceRole
from tests.helpers import seed_user


def _auth(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user.id))}"}


# --------------------------------------------------------------------------- #
# Intent detection (pure)
# --------------------------------------------------------------------------- #
def test_intent_detection_rules() -> None:
    assert detect_intent("Create a daily sales pipeline from PostgreSQL to Snowflake") == "pipeline"
    assert detect_intent("Show me why yesterday's pipeline failed") == "incident"
    assert detect_intent("Optimize this SQL query") == "sql"
    assert detect_intent("Design the architecture for this requirement") == "architecture"
    assert detect_intent("What is the health status of the platform?") == "monitoring"
    assert detect_intent("Create a task for Dinesh to fix validation") == "task"


def test_task_title_strips_assignee_and_priority() -> None:
    """Regression: 'Create a high task for Maya to fix X' used to leave the
    assignee phrase and priority words inside the stored task title."""
    from app.api.v1.workspace import _task_title_from

    assert _task_title_from("Create a high task for Maya to fix the failed validation", "Maya") == (
        "Fix the failed validation"
    )
    assert _task_title_from("create a task for Dinesh to repair the pipeline", "Dinesh") == (
        "Repair the pipeline"
    )
    assert _task_title_from("Create a task to archive stale tables") == "Archive stale tables"
    assert detect_intent("hello there") == "general"


# --------------------------------------------------------------------------- #
# Endpoint
# --------------------------------------------------------------------------- #
async def test_chat_pipeline_intent_returns_artifacts(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    user = await seed_user(db_session, role=UserRole.viewer)
    resp = await client.post(
        "/api/v1/workspace/chat",
        json={"message": "Create a daily sales pipeline from PostgreSQL to Snowflake"},
        headers=_auth(user),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["intent"] == "pipeline"
    assert "pipeline" in body["reply"].lower()
    assert any(a["type"] == "pipeline" for a in body["artifacts"])
    assert "context" in body


async def test_chat_incident_intent_reads_real_incidents(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    user = await seed_user(db_session, role=UserRole.viewer)
    resp = await client.post(
        "/api/v1/workspace/chat",
        json={"message": "Show me why yesterday's pipeline failed"},
        headers=_auth(user),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["intent"] == "incident"
    # No seeded incidents in this test → honest reply, no fake artifact
    assert "no open incidents" in body["reply"].lower()


async def test_chat_task_intent_requires_project(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    engineer = await seed_user(db_session, role=UserRole.engineer)
    resp = await client.post(
        "/api/v1/workspace/chat",
        json={"message": "Create a task to fix the failed validation"},
        headers=_auth(engineer),
    )
    assert resp.status_code == 200
    assert "select a project" in resp.json()["reply"].lower()


async def test_chat_task_intent_creates_real_task(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    engineer = await seed_user(db_session, role=UserRole.engineer)
    ws = Workspace(name=f"WS {uuid.uuid4().hex[:6]}", slug=f"ws-{uuid.uuid4().hex[:10]}")
    db_session.add(ws)
    await db_session.flush()
    db_session.add(WorkspaceMember(workspace_id=ws.id, user_id=engineer.id, role=WorkspaceRole.owner))
    project = Project(workspace_id=ws.id, name="Sales ETL", created_by=engineer.id)
    db_session.add(project)
    maya = User(
        email=f"maya-{uuid.uuid4().hex[:6]}@acmedata.io",
        full_name="Maya Test",
        password_hash="x",
        role=UserRole.engineer,
    )
    db_session.add(maya)
    await db_session.commit()

    resp = await client.post(
        "/api/v1/workspace/chat",
        json={
            "message": f"Create a critical task for {maya.full_name.split()[0]} to fix the failed validation",
            "projectId": str(project.id),
        },
        headers=_auth(engineer),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["intent"] == "task"
    task_artifact = next(a for a in body["artifacts"] if a["type"] == "task")
    row = await db_session.get(Task, uuid.UUID(task_artifact["taskId"]))
    assert row is not None
    assert row.priority.value == "critical"
    assert row.source == "agent"
    assert row.workspace_id == ws.id
    # The named person must be REALLY assigned, not just mentioned in the reply.
    assert row.assignee_id == maya.id
    assert "fix the failed validation" in row.title.lower()
    assert "for maya" not in row.title.lower() and "critical" not in row.title.lower()


async def test_chat_task_intent_unknown_person_replies_honestly(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    engineer = await seed_user(db_session, role=UserRole.engineer)
    ws = Workspace(name=f"WS {uuid.uuid4().hex[:6]}", slug=f"ws-{uuid.uuid4().hex[:10]}")
    db_session.add(ws)
    await db_session.flush()
    db_session.add(WorkspaceMember(workspace_id=ws.id, user_id=engineer.id, role=WorkspaceRole.owner))
    project = Project(workspace_id=ws.id, name="Sales ETL 2", created_by=engineer.id)
    db_session.add(project)
    await db_session.commit()

    resp = await client.post(
        "/api/v1/workspace/chat",
        json={
            "message": "Create a high task for Zaphod to fix the failed validation",
            "projectId": str(project.id),
        },
        headers=_auth(engineer),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["intent"] == "task"
    assert "couldn't find" in body["reply"].lower()


async def test_chat_knowledge_intent_uses_rag_layer(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    user = await seed_user(db_session, role=UserRole.viewer)
    resp = await client.post(
        "/api/v1/workspace/chat",
        json={"message": "Do we have a runbook for kafka consumer lag?"},
        headers=_auth(user),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["intent"] == "knowledge"


async def test_chat_requires_auth(client: httpx.AsyncClient) -> None:
    resp = await client.post("/api/v1/workspace/chat", json={"message": "hi"})
    assert resp.status_code == 401
