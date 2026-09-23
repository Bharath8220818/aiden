"""Agents endpoints — fleet roster, swarm feed, status + tool-grant control,
and the Phase 11 orchestrator (POST /agents/orchestrate/{workflow})."""

from __future__ import annotations

import asyncio
import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import AuthContext, require_permission
from app.models import AgentRun, AgentStageRun
from app.services.orchestrator_service import WORKFLOWS, OrchestratorService, list_runs
from app.services.registry_service import RegistryService

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("")
async def list_agents(
    ctx: AuthContext = Depends(require_permission("agent.read")),
    db: AsyncSession = Depends(get_db),
):
    return await RegistryService(db).agents()


@router.get("/swarm")
async def swarm_feed(
    ctx: AuthContext = Depends(require_permission("agent.read")),
    db: AsyncSession = Depends(get_db),
):
    return await RegistryService(db).swarm_messages()


@router.post("/{agent_id}/status")
async def set_agent_status(
    agent_id: str,
    payload: dict,
    ctx: AuthContext = Depends(require_permission("agent.control")),
    db: AsyncSession = Depends(get_db),
):
    return await RegistryService(db).agent_status_update(agent_id, bool(payload.get("paused", False)))


@router.post("/{agent_id}/grants")
async def set_agent_grant(
    agent_id: str,
    payload: dict,
    ctx: AuthContext = Depends(require_permission("agent.control")),
    db: AsyncSession = Depends(get_db),
):
    tool = str(payload.get("tool") or "")
    enabled = bool(payload.get("enabled", True))
    return await RegistryService(db).agent_grant_update(agent_id, tool, enabled)


# --------------------------------------------------------------------------- #
# Orchestrator — the 11-stage workflow (spec §6, diagram center)
# --------------------------------------------------------------------------- #
@router.get("/workflows")
async def list_workflows(
    ctx: AuthContext = Depends(require_permission("agent.read")),
):
    """Available orchestrated workflows with their stage lists."""
    return [
        {
            "id": wf_id,
            "label": definition["label"],
            "description": definition["description"],
            "stages": definition["stages"],
        }
        for wf_id, definition in WORKFLOWS.items()
    ]


@router.get("/runs")
async def agent_runs(
    limit: int = Query(20, ge=1, le=100),
    ctx: AuthContext = Depends(require_permission("agent.read")),
    db: AsyncSession = Depends(get_db),
):
    runs = await list_runs(db, limit=limit)
    return [
        {
            "id": str(run.id),
            "workflow": run.workflow,
            "status": run.status.value if hasattr(run.status, "value") else run.status,
            "prompt": run.prompt,
            "currentStage": run.current_stage,
            "stageIndex": run.stage_index,
            "stages": run.stages,
            "outputs": run.outputs,
            "error": run.error,
            "projectId": str(run.project_id) if run.project_id else None,
            "startedAt": run.started_at.isoformat() if run.started_at else None,
            "finishedAt": run.finished_at.isoformat() if run.finished_at else None,
        }
        for run in runs
    ]


@router.get("/runs/{run_id}")
async def agent_run_detail(
    run_id: str,
    ctx: AuthContext = Depends(require_permission("agent.read")),
    db: AsyncSession = Depends(get_db),
):
    """One run with its per-stage rows — the live timeline's data source."""
    try:
        run_uuid = uuid.UUID(run_id)
    except ValueError as exc:
        from app.core.exceptions import NotFoundError

        raise NotFoundError("Run not found") from exc
    run = await db.get(AgentRun, run_uuid)
    if run is None:
        from app.core.exceptions import NotFoundError

        raise NotFoundError("Run not found")
    # Explicit select (async sessions cannot lazy-load relationships).
    from sqlalchemy import select

    stage_rows = sorted(
        (
            await db.execute(
                select(AgentStageRun)
                .where(AgentStageRun.run_id == run_uuid)
                .order_by(AgentStageRun.stage_no)
            )
        )
        .scalars()
        .all(),
        key=lambda r: r.stage_no,
    )
    return {
        "id": str(run.id),
        "workflow": run.workflow,
        "status": run.status.value if hasattr(run.status, "value") else run.status,
        "prompt": run.prompt,
        "currentStage": run.current_stage,
        "stageIndex": run.stage_index,
        "projectId": str(run.project_id) if run.project_id else None,
        "error": run.error,
        "startedAt": run.started_at.isoformat() if run.started_at else None,
        "finishedAt": run.finished_at.isoformat() if run.finished_at else None,
        "stageRuns": [
            {
                "stageNo": r.stage_no,
                "stageId": r.stage_id,
                "label": r.label,
                "agent": r.agent,
                "status": r.status.value if hasattr(r.status, "value") else r.status,
                "output": r.output,
                "error": r.error,
                "durationMs": r.duration_ms,
                "startedAt": r.started_at.isoformat() if r.started_at else None,
                "finishedAt": r.finished_at.isoformat() if r.finished_at else None,
            }
            for r in stage_rows
        ],
    }


@router.post("/orchestrate/{workflow}")
async def orchestrate(
    workflow: str,
    payload: dict | None = None,
    ctx: AuthContext = Depends(require_permission("agent.control")),
    db: AsyncSession = Depends(get_db),
):
    """Start an orchestrated workflow run and execute it to completion.

    Stage progress streams over the WebSocket bus (`/agents` toasts in the
    SwarmFeed); the persisted run (stages + outputs) is returned synchronously.
    """
    service = OrchestratorService(db)
    run = await service.start(
        workflow=workflow,
        prompt=(payload or {}).get("prompt"),
        created_by=ctx.user.id,
        project_id=_optional_project_id((payload or {}).get("projectId")),
    )
    run = await service.run_pending(run.id)
    return {
        "id": str(run.id),
        "workflow": run.workflow,
        "status": run.status.value if hasattr(run.status, "value") else run.status,
        "prompt": run.prompt,
        "currentStage": run.current_stage,
        "stageIndex": run.stage_index,
        "stages": run.stages,
        "outputs": run.outputs,
        "error": run.error,
        "projectId": str(run.project_id) if run.project_id else None,
        "startedAt": run.started_at.isoformat() if run.started_at else None,
        "finishedAt": run.finished_at.isoformat() if run.finished_at else None,
    }


def _optional_project_id(raw: object) -> uuid.UUID | None:
    if not raw:
        return None
    try:
        return uuid.UUID(str(raw))
    except ValueError as exc:
        from app.core.exceptions import ValidationError

        raise ValidationError("projectId must be a valid UUID") from exc


@router.post("/orchestrate/{workflow}/async")
async def orchestrate_async(
    workflow: str,
    payload: dict | None = None,
    ctx: AuthContext = Depends(require_permission("agent.control")),
    db: AsyncSession = Depends(get_db),
):
    """Start a run without blocking the request; progress flows via WebSocket.

    The background task uses its own session (the request session closes).
    """
    from app.core.database import AsyncSessionLocal

    service = OrchestratorService(db)
    run = await service.start(
        workflow=workflow,
        prompt=(payload or {}).get("prompt"),
        created_by=ctx.user.id,
        project_id=_optional_project_id((payload or {}).get("projectId")),
    )
    run_id = run.id

    async def _execute() -> None:
        async with AsyncSessionLocal() as session:
            await OrchestratorService(session).run_pending(run_id)

    asyncio.create_task(_execute())
    return {
        "id": str(run.id),
        "workflow": run.workflow,
        "status": "running",
        "message": "Orchestration started — follow live events on /agents",
    }
