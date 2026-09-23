"""HIGH-risk tool calls → approval queue (spec §15) + Jira MCP tool.

Covers the §15 flow end to end:
    governed HIGH-risk call → pending Approval (request_type=tool_execution)
    → lead approves via /approvals/{id}/approve → registry.resume() executes
    the stored call → audit row with via=approval.

And the Jira tool: honest 'skipped' when unconfigured, permission-gated.
"""

from __future__ import annotations

import uuid

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.models import Project, User, UserRole
from app.models.approval import Approval, ApprovalType
from tests.helpers import seed_user


def _auth(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user.id))}"}


# --------------------------------------------------------------------------- #
# §15: HIGH-risk governed call queues an approval, lead approves, tool resumes
# --------------------------------------------------------------------------- #
async def test_high_risk_tool_creates_approval(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    from app.services.tool_registry import build_default_registry

    engineer = await seed_user(db_session, role=UserRole.engineer)
    from app.models import Pipeline, PipelineType, Workspace, WorkspaceMember, WorkspaceRole

    ws = Workspace(name=f"WS {uuid.uuid4().hex[:6]}", slug=f"ws-{uuid.uuid4().hex[:10]}")
    db_session.add(ws)
    await db_session.flush()
    db_session.add(
        WorkspaceMember(workspace_id=ws.id, user_id=engineer.id, role=WorkspaceRole.owner)
    )
    project = Project(workspace_id=ws.id, name="Trigger P", created_by=engineer.id)
    db_session.add(project)
    await db_session.flush()
    pipeline = Pipeline(
        project_id=project.id,
        name=f"trigger-{uuid.uuid4().hex[:6]}",
        pipeline_type=PipelineType.batch,
        created_by=engineer.id,
    )
    db_session.add(pipeline)
    await db_session.commit()

    registry = build_default_registry()
    result = await registry.execute(
        "pipeline.trigger",
        db=db_session,
        user_id=engineer.id,
        permissions={"pipeline.execute", "agent.read"},
        params={"pipeline_id": str(pipeline.id)},
        project_id=project.id,
    )
    assert result["status"] == "approval-required"
    approval_id = uuid.UUID(result["approvalId"])

    row = await db_session.get(Approval, approval_id)
    assert row is not None
    assert row.request_type == ApprovalType.tool_execution
    assert row.status == "pending"
    assert row.payload["tool"] == "pipeline.trigger"
    assert row.payload["params"]["pipeline_id"] == str(pipeline.id)

    # No run must exist before approval
    from app.models import PipelineRun

    runs = (await db_session.execute(select(PipelineRun))).scalars().all()
    assert runs == []


async def test_approve_executes_queued_tool_call(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    from app.services.tool_registry import build_default_registry

    engineer = await seed_user(db_session, role=UserRole.engineer)
    lead = await seed_user(db_session, role=UserRole.lead)
    from app.models import (
        Pipeline,
        PipelineRun,
        PipelineType,
        Project,
        Workspace,
        WorkspaceMember,
        WorkspaceRole,
    )

    ws = Workspace(name=f"WS {uuid.uuid4().hex[:6]}", slug=f"ws-{uuid.uuid4().hex[:10]}")
    db_session.add(ws)
    await db_session.flush()
    db_session.add(
        WorkspaceMember(workspace_id=ws.id, user_id=engineer.id, role=WorkspaceRole.owner)
    )
    project = Project(workspace_id=ws.id, name="Approve P", created_by=engineer.id)
    db_session.add(project)
    await db_session.flush()
    pipeline = Pipeline(
        project_id=project.id,
        name=f"approve-{uuid.uuid4().hex[:6]}",
        pipeline_type=PipelineType.batch,
        created_by=engineer.id,
    )
    db_session.add(pipeline)
    await db_session.commit()

    registry = build_default_registry()
    result = await registry.execute(
        "pipeline.trigger",
        db=db_session,
        user_id=engineer.id,
        permissions={"pipeline.execute"},
        params={"pipeline_id": str(pipeline.id)},
        project_id=project.id,
    )
    assert result["status"] == "approval-required"
    approval_id = result["approvalId"]

    # Lead approves through the governance API → the queued call executes
    resp = await client.post(
        f"/api/v1/approvals/{approval_id}/approve", headers=_auth(lead)
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["toolResult"]["status"] == "ok"
    assert body["toolResult"]["pipeline"] == pipeline.name

    run = (await db_session.execute(select(PipelineRun))).scalars().first()
    assert run is not None and str(run.pipeline_id) == str(pipeline.id)
    assert run.trigger_type == "manual"

    # Audit trail records the resumed execution
    from app.models import AuditLog

    audit = (
        await db_session.execute(
            select(AuditLog).where(AuditLog.action == "tool.pipeline.trigger")
        )
    ).scalars().all()
    assert any(a.details.get("via") == "approval" for a in audit)


async def test_chat_run_request_queues_approval(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    """'Run the orders pipeline' in chat → governed trigger → approval-required."""
    lead = await seed_user(db_session, role=UserRole.lead)
    from app.models import (
        Pipeline,
        PipelineType,
        Project,
        Workspace,
        WorkspaceMember,
        WorkspaceRole,
    )

    ws = Workspace(name=f"WS {uuid.uuid4().hex[:6]}", slug=f"ws-{uuid.uuid4().hex[:10]}")
    db_session.add(ws)
    await db_session.flush()
    db_session.add(
        WorkspaceMember(workspace_id=ws.id, user_id=lead.id, role=WorkspaceRole.owner)
    )
    project = Project(workspace_id=ws.id, name="Chat P", created_by=lead.id)
    db_session.add(project)
    await db_session.flush()
    pipeline = Pipeline(
        project_id=project.id,
        name="orders daily etl",
        pipeline_type=PipelineType.batch,
        created_by=lead.id,
    )
    db_session.add(pipeline)
    await db_session.commit()

    resp = await client.post(
        "/api/v1/workspace/chat",
        json={"message": "Run the orders daily etl pipeline", "projectId": str(project.id)},
        headers=_auth(lead),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["intent"] == "pipeline"
    assert body["approvalId"]
    assert "approval" in body["reply"].lower()

    # And approving it via the API actually starts the run
    from app.models import PipelineRun

    resp = await client.post(
        f"/api/v1/approvals/{body['approvalId']}/approve", headers=_auth(lead)
    )
    assert resp.status_code == 200
    run = (await db_session.execute(select(PipelineRun))).scalars().first()
    assert run is not None


async def test_approve_requires_lead(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    engineer = await seed_user(db_session, role=UserRole.engineer)
    approval = Approval(
        project_id=None,
        request_type=ApprovalType.tool_execution,
        status="pending",
        risk_level="high",
        summary="Tool execution: pipeline.trigger — test",
        requested_by=engineer.id,
        tool_execution_id=uuid.uuid4(),
        payload={"tool": "pipeline.trigger", "params": {}},
    )
    db_session.add(approval)
    await db_session.commit()

    resp = await client.post(
        f"/api/v1/approvals/{approval.id}/approve", headers=_auth(engineer)
    )
    assert resp.status_code == 403


# --------------------------------------------------------------------------- #
# Jira MCP tool
# --------------------------------------------------------------------------- #
async def test_jira_tool_degrades_honestly(db_session: AsyncSession) -> None:
    from app.services.tool_registry import build_default_registry

    user = await seed_user(db_session, role=UserRole.engineer)
    registry = build_default_registry()
    result = await registry.execute(
        "team.jira_create_issue",
        db=db_session,
        user_id=user.id,
        permissions={"task.create"},
        params={"summary": "Fix the failed validation"},
    )
    # Jira is not configured in the test env → honest skip, never fabricated
    assert result["status"].startswith("skipped")


async def test_jira_chat_intent_honest(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    engineer = await seed_user(db_session, role=UserRole.engineer)
    resp = await client.post(
        "/api/v1/workspace/chat",
        json={"message": "Ticket this to Maya: the nightly load keeps failing"},
        headers=_auth(engineer),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["intent"] == "jira"
    # Unconfigured Jira → honest reply + draft task artifact (no fake ticket)
    assert "configured" in body["reply"] and "JIRA_URL" in body["reply"]
    artifact = (body.get("artifacts") or [{}])[0]
    assert artifact.get("type") in {"task", None}
