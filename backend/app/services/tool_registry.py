"""Tool Registry — every AI-invocable capability with the §15 security flow.

    intent → Tool Registry → permission check → risk assessment
           → (approval gate) → execution → result → audit log

Each tool is a declarative `ToolSpec`: name, category, required permission,
risk level, and handler. `ToolRegistry.execute()` is the ONLY path the
workspace chat / agents take to act on the outside world — the registry
enforces RBAC + risk policy and writes the audit trail so no tool call can
bypass governance. Risk policy (spec §15):

    LOW      → automatic for permitted roles
    MEDIUM   → permission-gated (the send/introspect tier)
    HIGH     → requires an explicit Approval row (lead+) before execution
    CRITICAL → hard-blocked (never auto-executed)

The database adapters already block destructive SQL independently (defense in
depth); the risk gate is the governance layer above them.
"""

from __future__ import annotations

import uuid
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.integrations.mcp.permissions import POLICIES
from app.models.audit_log import AuditLog as AuditLogModel

logger = get_logger("aiden.tools")

# --------------------------------------------------------------------------- #
# Tool specification
# --------------------------------------------------------------------------- #
Handler = Callable[["ToolContext"], Awaitable[dict[str, Any]]]


@dataclass(frozen=True)
class ToolContext:
    """Everything a tool handler may need — built by ToolRegistry.execute()."""

    db: AsyncSession
    user_id: uuid.UUID | None
    workspace_id: uuid.UUID | None
    project_id: uuid.UUID | None
    params: dict[str, Any]


@dataclass(frozen=True)
class ToolSpec:
    name: str
    description: str
    category: str  # database | communication | team | platform
    permission: str  # required RBAC permission
    risk: str  # low | medium | high | critical
    handler: Handler
    requires_approval_above: str | None = None  # e.g. risk HIGH → "approval.approve"

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "permission": self.permission,
            "risk": self.risk,
        }


# --------------------------------------------------------------------------- #
# Errors
# --------------------------------------------------------------------------- #
class ToolError(Exception):
    def __init__(self, message: str, *, code: str = "TOOL_ERROR", status_code: int = 400) -> None:
        super().__init__(message)
        self.code = code
        self.status_code = status_code


class ToolPermissionError(ToolError):
    def __init__(self, tool: str, permission: str) -> None:
        super().__init__(
            f"Missing permission '{permission}' for tool '{tool}'",
            code="TOOL_PERMISSION_DENIED",
            status_code=403,
        )


class ToolRiskError(ToolError):
    def __init__(self, message: str, *, code: str = "TOOL_RISK_BLOCKED") -> None:
        super().__init__(message, code=code, status_code=403)


# --------------------------------------------------------------------------- #
# Registry
# --------------------------------------------------------------------------- #
_RISK_RANK = {"low": 0, "medium": 1, "high": 2, "critical": 3}


class ToolRegistry:
    """Declarative tool catalog + the governed execution path."""

    def __init__(self) -> None:
        self._tools: dict[str, ToolSpec] = {}

    def register(self, spec: ToolSpec) -> None:
        self._tools[spec.name] = spec

    def get(self, name: str) -> ToolSpec:
        tool = self._tools.get(name)
        if tool is None:
            raise ToolError(f"Unknown tool: {name}", code="TOOL_NOT_FOUND", status_code=404)
        return tool

    def list_for(self, permissions: set[str] | frozenset[str]) -> list[dict[str, Any]]:
        """Catalog visible to a permission set (used by GET /workspace/tools)."""
        return [
            spec.to_dict()
            for spec in self._tools.values()
            if spec.permission in permissions
        ]

    async def execute(
        self,
        tool_name: str,
        *,
        db: AsyncSession,
        user_id: uuid.UUID | None,
        permissions: set[str] | frozenset[str],
        params: dict[str, Any] | None = None,
        workspace_id: uuid.UUID | None = None,
        project_id: uuid.UUID | None = None,
        approver: bool = False,
    ) -> dict[str, Any]:
        """The §15 flow: permission → risk → execute → audit."""
        tool = self.get(tool_name)

        # 1. Permission check
        if tool.permission not in permissions:
            raise ToolPermissionError(tool.name, tool.permission)

        # 2. Risk assessment
        risk = _RISK_RANK.get(tool.risk, 3)
        if risk >= _RISK_RANK["critical"]:
            raise ToolRiskError(f"Tool '{tool.name}' is critical — blocked from automated execution")
        if risk >= _RISK_RANK["high"] and not approver:
            # §15: HIGH-risk actions don't run — they open a pending Approval
            # row (lead+) in the governance queue; ToolRegistry.resume()
            # executes the stored call once it is signed off.
            approval = await _enqueue_tool_approval(
                db=db,
                tool=tool,
                params=params or {},
                user_id=user_id,
                project_id=project_id,
            )
            try:
                db.add(
                    AuditLogModel(
                        workspace_id=workspace_id,
                        project_id=project_id,
                        user_id=user_id,
                        action=f"tool.{tool.name}",
                        resource_type="tool",
                        resource_id=tool.name,
                        details={
                            "risk": tool.risk,
                            "params": _safe_params(params or {}),
                            "outcome": "approval-required",
                            "approval_id": str(approval.id),
                        },
                    )
                )
                await db.commit()
            except Exception:  # noqa: BLE001
                logger.warning("Audit write failed for tool %s", tool.name, exc_info=True)
            return {
                "tool": tool.name,
                "risk": tool.risk,
                "status": "approval-required",
                "approvalId": str(approval.id),
                "message": (
                    f"Tool '{tool.name}' is HIGH risk — queued for lead approval "
                    "(Governance → Approvals)"
                ),
            }

        # 3. Execute (handler exceptions propagate as ToolError via callers)
        context = ToolContext(
            db=db,
            user_id=user_id,
            workspace_id=workspace_id,
            project_id=project_id,
            params=params or {},
        )
        result = await tool.handler(context)

        # 4. Audit log — append-only trail (best-effort never fails the call)
        try:
            db.add(
                AuditLogModel(
                    workspace_id=workspace_id,
                    project_id=project_id,
                    user_id=user_id,
                    action=f"tool.{tool.name}",
                    resource_type="tool",
                    resource_id=tool.name,
                    details={
                        "risk": tool.risk,
                        "params": _safe_params(params or {}),
                        "outcome": result.get("status", "ok") if isinstance(result, dict) else "ok",
                    },
                )
            )
            await db.commit()
        except Exception:  # noqa: BLE001 — audit failures logged, not raised
            logger.warning("Audit write failed for tool %s", tool.name, exc_info=True)

        return {"tool": tool.name, "risk": tool.risk, **result}

    async def resume(self, approval, db: AsyncSession) -> dict[str, Any]:
        """Execute a queued HIGH-risk call after its Approval was granted.

        The approver's session provides the DB; permission was already checked
        for the requester at enqueue time and the approval signature is the
        authorization. Bypasses the risk gate by construction (approvers only).
        """
        payload = approval.payload or {}
        tool_name = payload.get("tool")
        if not tool_name:
            raise ToolError("Approval has no stored tool call", code="TOOL_NOT_FOUND", status_code=404)
        tool = self.get(tool_name)

        requested_by = payload.get("requested_by")
        project_id = payload.get("project_id")
        context = ToolContext(
            db=db,
            user_id=uuid.UUID(requested_by) if requested_by else None,
            workspace_id=None,
            project_id=uuid.UUID(project_id) if project_id else None,
            params=payload.get("params") or {},
        )
        result = await tool.handler(context)
        try:
            db.add(
                AuditLogModel(
                    project_id=context.project_id,
                    user_id=context.user_id,
                    action=f"tool.{tool.name}",
                    resource_type="tool",
                    resource_id=tool.name,
                    details={
                        "risk": tool.risk,
                        "params": _safe_params(payload.get("params") or {}),
                        "outcome": result.get("status", "ok") if isinstance(result, dict) else "ok",
                        "via": "approval",
                        "approval_id": str(approval.id),
                    },
                )
            )
            await db.commit()
        except Exception:  # noqa: BLE001
            logger.warning("Audit write failed for resumed tool %s", tool.name, exc_info=True)
        return {"tool": tool.name, "risk": tool.risk, **result}


async def _enqueue_tool_approval(
    *,
    db: AsyncSession,
    tool: ToolSpec,
    params: dict[str, Any],
    user_id: uuid.UUID | None,
    project_id: uuid.UUID | None,
):
    """Create the pending Approval row that gates a HIGH-risk tool call."""
    from app.models.approval import Approval, ApprovalStatus, ApprovalType, RiskLevel

    # The stored call: resume() re-executes the registered handler with these
    # params once a lead approves. Secrets never enter the queue — params hold
    # ids/message text by contract; _json_safe coerces UUIDs/dates for JSON.
    call_payload = {
        "tool": tool.name,
        "params": _json_safe(params),
        "requested_by": str(user_id) if user_id else None,
        "project_id": str(project_id) if project_id else None,
    }
    approval = Approval(
        project_id=project_id,
        request_type=ApprovalType.tool_execution,
        status=ApprovalStatus.pending,
        risk_level=RiskLevel.high,
        summary=f"Tool execution: {tool.name} — {_summarize(params)}",
        requested_by=user_id,
        tool_execution_id=uuid.uuid4(),
        payload=call_payload,
    )
    db.add(approval)
    await db.commit()
    return approval


def _summarize(params: dict[str, Any]) -> str:
    """Human summary for the approval queue (subject/title/first field)."""
    for key in ("subject", "title", "summary", "query"):
        value = params.get(key)
        if value:
            return str(value)[:160]
    return ", ".join(sorted(k for k in params))[:160] or "(no params)"


def _json_safe(value: Any) -> Any:
    """Coerce non-JSON-native types (UUID, datetime, Decimal) so details always serializes."""
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    return value


def _safe_params(params: dict[str, Any]) -> dict[str, Any]:
    """Never record secret material in the audit trail; coerce UUIDs/dates."""
    safe: dict[str, Any] = {}
    for key, value in params.items():
        if any(s in key.lower() for s in ("password", "secret", "token", "key")):
            safe[key] = "***"
        else:
            safe[key] = _json_safe(value)
    return safe


# --------------------------------------------------------------------------- #
# Tool implementations — database tools (through the adapter registry)
# --------------------------------------------------------------------------- #
async def _tool_introspect(ctx: ToolContext) -> dict[str, Any]:
    """Introspect a connection through its adapter (metadata only)."""
    from app.integrations.databases.base import AdapterError
    from app.integrations.databases.registry import build_adapter
    from app.models import ConnectionRegistry
    from app.services.secret_service import SecretService

    connection_id = str(ctx.params.get("connection_id") or "")
    scope = str(ctx.params.get("scope") or "tables")
    connection = await ctx.db.get(ConnectionRegistry, connection_id)
    if connection is None:
        raise ToolError(f"Connection '{connection_id}' not found", code="CONNECTION_NOT_FOUND", status_code=404)

    try:
        adapter = build_adapter(connection.provider_id, await SecretService(ctx.db).resolve(connection))
        await adapter.test_connection()
        if scope == "columns":
            table = ctx.params.get("table")
            if not table:
                raise ToolError("`table` param required for scope=columns")
            columns = await adapter.get_columns(table, ctx.params.get("schema"))
            return {"status": "ok", "table": table, "columns": columns, "mode": "live"}
        tables = await adapter.get_tables(ctx.params.get("schema") or connection.database)
        return {"status": "ok", "tables": tables, "mode": "live"}
    except AdapterError as exc:
        return {"status": "adapter-error", "error": str(exc), "mode": "unavailable"}


async def _tool_query(ctx: ToolContext) -> dict[str, Any]:
    """Read-only SELECT through an adapter (destructive SQL blocked in base)."""
    from app.integrations.databases.base import AdapterError
    from app.integrations.databases.registry import build_adapter
    from app.models import ConnectionRegistry
    from app.services.secret_service import SecretService

    connection = await ctx.db.get(ConnectionRegistry, str(ctx.params.get("connection_id") or ""))
    if connection is None:
        raise ToolError("Connection not found", code="CONNECTION_NOT_FOUND", status_code=404)
    query = str(ctx.params.get("query") or "")
    try:
        adapter = build_adapter(connection.provider_id, await SecretService(ctx.db).resolve(connection))
        rows = await adapter.execute_query(query, max_rows=int(ctx.params.get("max_rows", 100)))
        return {"status": "ok", "rows": rows, "rowCount": len(rows), "mode": "live"}
    except AdapterError as exc:
        return {"status": "adapter-error", "error": str(exc)}


# --------------------------------------------------------------------------- #
# Communication tools
# --------------------------------------------------------------------------- #
async def _tool_send_email(ctx: ToolContext) -> dict[str, Any]:
    from app.services.notification_service import NotificationService

    result = await NotificationService(ctx.db).dispatch(
        workspace_id=ctx.workspace_id,
        title=str(ctx.params.get("subject") or "Message from AIDEN"),
        message=str(ctx.params.get("body") or ""),
        link=ctx.params.get("link"),
        severity=str(ctx.params.get("severity") or "info"),
        user_ids=ctx.params.get("user_ids"),
        channels=("internal", "email"),
    )
    return {"status": "ok" if not str(result.get("email", "")).startswith("failed") else "partial", "channels": result}


async def _tool_send_chat(ctx: ToolContext) -> dict[str, Any]:
    from app.services.notification_service import NotificationService

    result = await NotificationService(ctx.db).dispatch(
        workspace_id=ctx.workspace_id,
        title=str(ctx.params.get("subject") or "AIDEN update"),
        message=str(ctx.params.get("body") or ""),
        link=ctx.params.get("link"),
        severity=str(ctx.params.get("severity") or "info"),
        channels=("internal", "slack", "teams"),
    )
    return {"status": "ok", "channels": result}


# --------------------------------------------------------------------------- #
# Team tools
# --------------------------------------------------------------------------- #
async def _tool_create_task(ctx: ToolContext) -> dict[str, Any]:
    from app.services.task_service import TaskService

    task = await TaskService(ctx.db).create(
        {
            "workspace_id": ctx.workspace_id,
            "project_id": ctx.project_id,
            "title": str(ctx.params.get("title") or "AIDEN task"),
            "description": ctx.params.get("description"),
            "priority": str(ctx.params.get("priority") or "medium"),
            "assignee_id": ctx.params.get("assignee_id"),
            "source": "agent",
        },
        created_by=ctx.user_id,
    )
    return {"status": "ok", "taskId": str(task.id), "title": task.title}


async def _tool_jira_issue(ctx: ToolContext) -> dict[str, Any]:
    """Create a Jira issue via the MCP REST adapter (honest degradation)."""
    from app.integrations.mcp.jira.adapter import JiraAdapter

    return await JiraAdapter().create_issue(
        summary=str(ctx.params.get("summary") or "AIDEN ticket"),
        description=str(ctx.params.get("description") or ""),
        assignee_name=ctx.params.get("assignee_name"),
        link=ctx.params.get("link"),
    )


async def _tool_trigger_pipeline(ctx: ToolContext) -> dict[str, Any]:
    """Trigger a pipeline run — HIGH risk (§15: 'change production pipeline')."""
    from app.models import Pipeline
    from app.repositories.pipeline_run_repository import PipelineRunRepository

    raw_id = ctx.params.get("pipeline_id")
    pipeline_key = uuid.UUID(str(raw_id)) if raw_id else None
    pipeline = await ctx.db.get(Pipeline, pipeline_key) if pipeline_key else None
    if pipeline is None:
        raise ToolError("Pipeline not found", code="PIPELINE_NOT_FOUND", status_code=404)
    run = await PipelineRunRepository(ctx.db).create(
        pipeline_id=pipeline.id, trigger_type="manual"
    )
    await ctx.db.commit()

    from app.services.event_bus import broadcast_pipeline_run

    await broadcast_pipeline_run(pipeline.name, "triggered", str(run.id))
    return {"status": "ok", "runId": str(run.id), "pipeline": pipeline.name}


# --------------------------------------------------------------------------- #
# Default registry instance
# --------------------------------------------------------------------------- #
def build_default_registry() -> ToolRegistry:
    registry = ToolRegistry()
    registry.register(
        ToolSpec(
            name="db.introspect",
            description="List tables/columns of a registered warehouse connection",
            category="database",
            permission="connection.read",
            risk="low",
            handler=_tool_introspect,
        )
    )
    registry.register(
        ToolSpec(
            name="db.query",
            description="Run a read-only SELECT against a warehouse",
            category="database",
            permission="sql.execute",
            risk="medium",
            handler=_tool_query,
        )
    )
    registry.register(
        ToolSpec(
            name="notify.email",
            description="Send an email through the notification service (SMTP)",
            category="communication",
            permission="notification.send",
            risk="medium",
            handler=_tool_send_email,
        )
    )
    registry.register(
        ToolSpec(
            name="notify.chat",
            description="Post to Slack/Teams channels via webhooks",
            category="communication",
            permission="notification.send",
            risk="medium",
            handler=_tool_send_chat,
        )
    )
    registry.register(
        ToolSpec(
            name="team.create_task",
            description="Create + assign a task in AIDEN's internal task system",
            category="team",
            permission="task.create",
            risk="low",
            handler=_tool_create_task,
        )
    )
    jira = POLICIES["team.jira_create_issue"]
    registry.register(
        ToolSpec(
            name=jira.name,
            description="Create a Jira issue (REST) — honest degradation when Jira is not configured",
            category="team",
            permission=jira.permission,
            risk=jira.risk,
            handler=_tool_jira_issue,
        )
    )
    trigger = POLICIES["pipeline.trigger"]
    registry.register(
        ToolSpec(
            name=trigger.name,
            description="Trigger a pipeline run (production action — requires lead approval)",
            category="platform",
            permission=trigger.permission,
            risk=trigger.risk,
            handler=_tool_trigger_pipeline,
        )
    )
    # §12 regression guard: every registered tool's policy matches mcp/permissions.py
    from app.integrations.mcp.permissions import POLICIES as ADAPTER_POLICIES

    for spec in registry._tools.values():  # noqa: SLF001
        policy = ADAPTER_POLICIES.get(spec.name)
        assert policy is None or (
            policy.permission == spec.permission and policy.risk == spec.risk
        ), f"policy drift for {spec.name}"
    return registry


registry = build_default_registry()
