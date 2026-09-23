"""Tool Registry tests — the §15 security flow end to end.

- Catalog visibility by permission set
- Permission enforcement (403-equivalent ToolPermissionError)
- Risk policy: low/medium auto, high needs approver, critical blocked
- Audit log written on governed execution
- Email intent via chat: permission-gated, honest degradation, audit trail
"""

from __future__ import annotations

import json
import uuid
from datetime import UTC, date, datetime

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.models import AuditLog, Task, User, UserRole, Workspace
from app.services.tool_registry import (
    ToolPermissionError,
    ToolRiskError,
    _safe_params,
    build_default_registry,
    registry,
)
from tests.helpers import seed_user


def _auth(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user.id))}"}


# --------------------------------------------------------------------------- #
# Registry mechanics
# --------------------------------------------------------------------------- #
def test_default_registry_has_expected_tools() -> None:
    build_default_registry()
    names = set(registry._tools)
    assert {"db.introspect", "db.query", "notify.email", "notify.chat", "team.create_task"} <= names


def test_catalog_filtered_by_permissions() -> None:
    viewer_tools = registry.list_for({"agent.read", "connection.read", "task.read", "notification.read"})
    assert all(t["permission"] in {"connection.read", "task.read", "notification.read"} for t in viewer_tools)
    assert not any(t["name"] == "db.query" for t in viewer_tools)  # needs sql.execute


def test_unknown_tool_raises() -> None:
    from app.services.tool_registry import ToolError

    with pytest.raises(ToolError):
        registry.get("does.not.exist")


async def test_permission_enforcement() -> None:
    async def _noop(ctx):
        return {"status": "ok"}

    from app.services.tool_registry import ToolSpec

    local = build_default_registry()
    local.register(
        ToolSpec(
            name="test.gated",
            description="t",
            category="platform",
            permission="sql.execute",
            risk="low",
            handler=_noop,
        )
    )
    with pytest.raises(ToolPermissionError):
        await local.execute(
            "test.gated",
            db=None,
            user_id=None,
            permissions={"agent.read"},
            params={},
        )


async def test_high_risk_requires_approver_and_critical_blocked(db_session) -> None:
    from app.services.tool_registry import ToolSpec

    async def _ok(ctx):
        return {"status": "ok"}

    local = build_default_registry()
    local.register(
        ToolSpec(name="test.high", description="t", category="platform", permission="agent.read", risk="high", handler=_ok)
    )
    local.register(
        ToolSpec(name="test.crit", description="t", category="platform", permission="agent.read", risk="critical", handler=_ok)
    )
    # §15: HIGH risk without an approver → pending Approval row, honest status
    result = await local.execute(
        "test.high", db=db_session, user_id=None, permissions={"agent.read"}, params={"subject": "Deploy fix"}
    )
    assert result["status"] == "approval-required"
    assert result["approvalId"]
    from sqlalchemy import select

    from app.models.approval import Approval

    row = (
        await db_session.execute(select(Approval).where(Approval.request_type == "tool_execution"))
    ).scalars().first()
    assert row is not None and row.status == "pending"
    assert row.payload["tool"] == "test.high"
    # With approver=True the high-risk call executes immediately
    result = await local.execute("test.high", db=None, user_id=None, permissions={"agent.read"}, approver=True)
    assert result["status"] == "ok"
    with pytest.raises(ToolRiskError):
        await local.execute("test.crit", db=None, user_id=None, permissions={"agent.read"}, approver=True)


def test_audit_params_mask_secrets() -> None:
    masked = _safe_params({"query": "SELECT 1", "password": "hunter2", "api_key": "abc"})
    assert masked["query"] == "SELECT 1"
    assert masked["password"] == "***"
    assert masked["api_key"] == "***"


def test_audit_params_json_safe_for_non_native_types() -> None:
    """Regression: tool params with UUIDs/dates/datetimes used to crash the audit
    write (JSON serialization) — the audit row was then lost entirely."""
    now = datetime.now(UTC)
    params = {
        "user_ids": [uuid.uuid4()],
        "incident_id": uuid.uuid4(),
        "due_date": date.today(),
        "at": now,
    }
    safe = _safe_params(params)  # must not raise
    json.dumps(safe)  # must not raise
    assert safe["incident_id"] == str(params["incident_id"])
    assert safe["user_ids"] == [str(params["user_ids"][0])]
    assert safe["due_date"] == params["due_date"].isoformat()
    assert safe["at"] == now.isoformat()


# --------------------------------------------------------------------------- #
# Workspace tools listing endpoint
# --------------------------------------------------------------------------- #
async def test_workspace_tools_endpoint(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    viewer = await seed_user(db_session, role=UserRole.viewer)
    resp = await client.get("/api/v1/workspace/tools", headers=_auth(viewer))
    assert resp.status_code == 200
    tools = resp.json()
    names = {t["name"] for t in tools}
    assert "db.introspect" in names  # viewer has connection.read
    assert "team.create_task" not in names  # viewer lacks task.create
    assert all({"name", "category", "risk", "permission"} <= set(t) for t in tools)


# --------------------------------------------------------------------------- #
# Email intent — governed natural-language email (spec §14)
# --------------------------------------------------------------------------- #
async def test_email_intent_permission_gated(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    viewer = await seed_user(db_session, role=UserRole.viewer)
    resp = await client.post(
        "/api/v1/workspace/chat",
        json={"message": "Send Dinesh an email saying the ETL issue is fixed"},
        headers=_auth(viewer),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["intent"] == "email"
    assert "can't send email" in body["reply"].lower() or "permission" in body["reply"].lower()


async def test_email_intent_engineer_degrades_honestly(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    engineer = await seed_user(db_session, role=UserRole.engineer)
    resp = await client.post(
        "/api/v1/workspace/chat",
        json={"message": "Send Dinesh an email saying the ETL issue is fixed"},
        headers=_auth(engineer),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["intent"] == "email"
    # No SMTP in tests → stored internally, honest about it, audit row written
    assert "audit trail" in body["reply"].lower()
    assert body.get("tool") == "notify.email"
    assert body.get("risk") == "medium"


async def test_email_intent_writes_audit_log(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    engineer = await seed_user(db_session, role=UserRole.engineer)
    await client.post(
        "/api/v1/workspace/chat",
        json={"message": "Send Priya an email saying the deploy is done"},
        headers=_auth(engineer),
    )
    rows = (
        (await db_session.execute(select(AuditLog).where(AuditLog.action == "tool.notify.email")))
        .scalars()
        .all()
    )
    assert rows, "email tool call must be audited"
    assert rows[-1].details.get("risk") == "medium"


# --------------------------------------------------------------------------- #
# Task tool through the governed path
# --------------------------------------------------------------------------- #
async def test_team_task_tool_via_registry(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    engineer = await seed_user(db_session, role=UserRole.engineer)
    ws = Workspace(name=f"WS {uuid.uuid4().hex[:6]}", slug=f"ws-{uuid.uuid4().hex[:10]}")
    db_session.add(ws)
    await db_session.commit()
    ws_id = ws.id

    from app.services.tool_registry import ToolContext

    assert ToolContext is not None  # import sanity; execution uses registry.execute
    result = await registry.execute(
        "team.create_task",
        db=db_session,
        user_id=engineer.id,
        permissions={"task.create", "agent.read"},
        params={"title": "Fix gateway"},
        workspace_id=ws_id,
    )
    assert result["status"] == "ok"
    row = await db_session.get(Task, uuid.UUID(result["taskId"]))
    assert row is not None and row.source == "agent" and row.priority.value == "medium"
