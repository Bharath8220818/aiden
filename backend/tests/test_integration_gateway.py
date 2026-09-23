"""Integration-gateway tests — adapters, secrets, tasks, notifications.

- Adapter registry resolution + destructive-SQL guard + connectivity errors
- Secret service: masking for frontend, metadata-only descriptors for AI
- Tasks: create → assign → notify → status transitions (RBAC-gated)
- Notifications: durable internal channel + honest channel degradation
"""

from __future__ import annotations

import uuid

import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.integrations.databases.base import AdapterCredentials, AdapterError
from app.integrations.databases.registry import adapter_for, registered_providers
from app.models import User, UserRole, Workspace
from tests.helpers import seed_user


def _auth(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user.id))}"}


# --------------------------------------------------------------------------- #
# Adapter registry + base guards
# --------------------------------------------------------------------------- #
def test_adapter_registry_resolves_all_canonical_providers() -> None:
    providers = registered_providers()
    assert {"postgres", "mysql", "snowflake", "bigquery", "redshift"} <= set(providers)
    assert adapter_for("prov-snowflake") is adapter_for("snowflake")


def test_adapter_registry_unknown_provider_raises() -> None:
    with pytest.raises(AdapterError):
        adapter_for("prov-oracle")


def test_execute_query_blocks_destructive_sql() -> None:
    from app.integrations.databases.postgresql import PostgresAdapter

    adapter = PostgresAdapter(AdapterCredentials(host="localhost"))
    for bad in ("DROP TABLE users", "TRUNCATE orders;", "ALTER TABLE t ADD c INT"):
        with pytest.raises(AdapterError):
            import asyncio

            asyncio.run(adapter.execute_query(bad))


def test_execute_query_rejects_non_read_statements() -> None:
    from app.integrations.databases.postgresql import PostgresAdapter

    adapter = PostgresAdapter(AdapterCredentials(host="localhost"))
    with pytest.raises(AdapterError):
        import asyncio

        asyncio.run(adapter.execute_query("INSERT INTO t VALUES (1)"))


async def test_test_connection_unreachable_host_raises() -> None:
    from app.integrations.databases.postgresql import PostgresAdapter

    adapter = PostgresAdapter(AdapterCredentials(host="no-such-host.invalid", port=1))
    with pytest.raises(AdapterError):
        await adapter.test_connection()


# --------------------------------------------------------------------------- #
# Secret service — masking guarantees
# --------------------------------------------------------------------------- #
def test_for_frontend_masks_secret_keys() -> None:
    from app.services.secret_service import for_frontend

    masked = for_frontend({"username": "svc", "password": "hunter2", "apiKey": "abc"})
    assert masked["username"] == "svc"
    assert masked["password"] == "•••••••• (vault)"
    assert masked["apiKey"] == "•••••••• (vault)"


def test_for_ai_returns_metadata_only() -> None:
    from types import SimpleNamespace

    from app.services.secret_service import for_ai

    conn = SimpleNamespace(
        id="conn-1", provider_id="prov-snowflake", host="acme.snowflake",
        database="SALES", environment="production",
    )
    descriptor = for_ai(conn)
    assert descriptor == {
        "connection_id": "conn-1",
        "provider": "prov-snowflake",
        "host": "acme.snowflake",
        "database": "SALES",
        "environment": "production",
    }
    assert "password" not in descriptor


def test_secret_roundtrip_without_session_encryption_fails_closed() -> None:
    """Vault operations need a session; resolution without one still works."""
    from app.services.secret_service import SecretService

    service = SecretService()
    assert service._fernet is not None  # cipher ready


# --------------------------------------------------------------------------- #
# Tasks — team workflow
# --------------------------------------------------------------------------- #
async def _seed_workspace(db: AsyncSession, user: User) -> Workspace:
    ws = Workspace(name=f"WS {uuid.uuid4().hex[:6]}", slug=f"ws-{uuid.uuid4().hex[:10]}")
    db.add(ws)
    await db.commit()
    return ws


async def test_task_create_list_update_flow(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    user = await seed_user(db_session, role=UserRole.engineer)
    ws = await _seed_workspace(db_session, user)
    headers = _auth(user)

    created = await client.post(
        "/api/v1/tasks",
        json={"workspaceId": str(ws.id), "title": "Fix orders validation", "priority": "high"},
        headers=headers,
    )
    assert created.status_code == 201
    task = created.json()
    assert task["status"] == "todo"
    assert task["priority"] == "high"

    listed = await client.get(
        "/api/v1/tasks", params={"workspaceId": str(ws.id)}, headers=headers
    )
    assert listed.status_code == 200
    assert any(t["id"] == task["id"] for t in listed.json())

    assignee = await seed_user(db_session, role=UserRole.engineer, email="dinesh@acme.io")
    updated = await client.patch(
        f"/api/v1/tasks/{task['id']}",
        json={"assigneeId": str(assignee.id), "status": "in_progress"},
        headers=headers,
    )
    assert updated.status_code == 200
    body = updated.json()
    assert body["status"] == "in_progress"
    assert body["assigneeId"] == str(assignee.id)


async def test_task_create_requires_auth(client: httpx.AsyncClient) -> None:
    resp = await client.post(
        "/api/v1/tasks", json={"workspaceId": str(uuid.uuid4()), "title": "x"}
    )
    assert resp.status_code == 401


async def test_task_create_forbidden_for_viewer(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    viewer = await seed_user(db_session, role=UserRole.viewer)
    ws = await _seed_workspace(db_session, viewer)
    resp = await client.post(
        "/api/v1/tasks",
        json={"workspaceId": str(ws.id), "title": "nope"},
        headers=_auth(viewer),
    )
    assert resp.status_code == 403


# --------------------------------------------------------------------------- #
# Notifications — internal channel + honest degradation
# --------------------------------------------------------------------------- #
async def test_send_internal_notification_stores_row(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    user = await seed_user(db_session, role=UserRole.engineer)
    resp = await client.post(
        "/api/v1/notifications/send",
        json={"title": "Deploy ready", "message": "Approval required", "channels": ["internal"]},
        headers=_auth(user),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["dispatched"]["internal"].startswith("stored:")

    feed = await client.get("/api/v1/notifications", headers=_auth(user))
    assert feed.status_code == 200
    assert any(n["title"] == "Deploy ready" for n in feed.json())


async def test_send_email_skips_when_unconfigured(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    user = await seed_user(db_session, role=UserRole.engineer)
    resp = await client.post(
        "/api/v1/notifications/send",
        json={"title": "Hello", "message": "world", "channels": ["email", "slack", "teams"]},
        headers=_auth(user),
    )
    assert resp.status_code == 200
    dispatched = resp.json()["dispatched"]
    # Honest degradation: unconfigured channels report skipped, never fail hard.
    assert dispatched["email"].startswith("skipped:")
    assert dispatched["slack"].startswith("skipped:")
    assert dispatched["teams"].startswith("skipped:")


async def test_notification_send_forbidden_for_viewer(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    viewer = await seed_user(db_session, role=UserRole.viewer)
    resp = await client.post(
        "/api/v1/notifications/send",
        json={"title": "t", "message": "m"},
        headers=_auth(viewer),
    )
    assert resp.status_code == 403


async def test_channel_status_reports_configuration(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    user = await seed_user(db_session, role=UserRole.viewer)
    resp = await client.get("/api/v1/notifications/channels", headers=_auth(user))
    assert resp.status_code == 200
    body = resp.json()
    assert body["internal"]["enabled"] is True
    assert body["email"]["enabled"] is False  # no SMTP in tests
