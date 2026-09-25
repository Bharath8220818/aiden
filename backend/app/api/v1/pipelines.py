"""Pipeline endpoints — permission-gated CRUD + run/deploy actions.

Deploy is a sensitive operation (Phase 2.8): an engineer may *request* it
(402-style `APPROVAL_REQUIRED` 409 response), a lead/admin approves it
through the approvals workflow. No direct execution path bypasses that gate.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import (
    AuthContext,
    ensure_pipeline_permission,
    ensure_project_permission,
    require_permission,
)
from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.models.approval import Approval, ApprovalStatus, ApprovalType, RiskLevel
from app.models.pipeline import Pipeline
from app.repositories.approval_repository import ApprovalRepository
from app.repositories.pipeline_run_repository import PipelineRunRepository
from app.schemas.pipeline import (
    PipelineCreate,
    PipelineListOut,
    PipelineOut,
    PipelineUpdate,
)
from app.schemas.pipeline_run import PipelineRunOut
from app.services.audit import AuditService
from app.services.pipeline_fleet_service import PipelineFleetService
from app.services.pipeline_service import PipelineService

router = APIRouter(prefix="/pipelines", tags=["pipelines"])


# --------------------------------------------------------------------------- #
# Pipeline Manager (fleet) + Builder codegen (Phase F frontend contract)
# --------------------------------------------------------------------------- #
@router.get("/fleet")
async def fleet(
    project_id: uuid.UUID | None = Query(None),
    ctx: AuthContext = Depends(require_permission("pipeline.read")),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Fleet listing for the Pipeline Manager — frontend `Pipeline[]` shape.

    `project_id` scopes the fleet to one project (the UI's project selector)."""
    return await PipelineFleetService(db).fleet(project_id=project_id)


@router.get("/{pipeline_id}/detail")
async def pipeline_detail(
    pipeline_id: str,
    ctx: AuthContext = Depends(require_permission("pipeline.read")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Master–detail bundle: pipeline summary + runs + tasks + logs.

    `pipeline_id` may be the literal `latest`/`first` — the manager's default
    selection — resolved to the most recently created pipeline."""
    resolved = pipeline_id
    if pipeline_id in {"latest", "first"}:
        from sqlalchemy import select

        row = (
            (await db.execute(select(Pipeline).order_by(Pipeline.created_at.desc()).limit(1)))
            .scalars()
            .first()
        )
        if row is None:
            raise NotFoundError("No pipelines exist yet")
        resolved = str(row.id)
    return await PipelineFleetService(db).detail(resolved)


@router.post("/generate")
async def generate_pipeline_code(
    payload: dict,
    ctx: AuthContext = Depends(require_permission("pipeline.create")),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Render PySpark / SQL / DAG / Kafka / pytest scaffolds from builder config."""
    return await PipelineFleetService(db).generate_artifacts(
        payload.get("config") or {}, payload.get("graph") or {}
    )


@router.post("", response_model=PipelineOut, status_code=status.HTTP_201_CREATED)
async def create_pipeline(
    payload: PipelineCreate,
    ctx: AuthContext = Depends(require_permission("pipeline.create")),
    db: AsyncSession = Depends(get_db),
) -> PipelineOut:
    await ensure_project_permission(db, ctx.user, payload.project_id, "pipeline.create")
    service = PipelineService(db)
    pipeline = await service.create(payload, created_by=ctx.user.id)
    AuditService(db).record(
        action="pipeline.create",
        resource_type="pipeline",
        resource_id=str(pipeline.id),
        project_id=payload.project_id,
        user_id=ctx.user.id,
        details={"name": payload.name, "pipeline_type": str(payload.pipeline_type)},
    )
    await db.commit()
    return await service.to_out(pipeline)


@router.get("", response_model=PipelineListOut)
async def list_pipelines(
    project_id: uuid.UUID | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    ctx: AuthContext = Depends(require_permission("pipeline.read")),
    db: AsyncSession = Depends(get_db),
) -> PipelineListOut:
    service = PipelineService(db)
    pipelines = await service.list(project_id=project_id, skip=skip, limit=limit)
    items = [await service.to_out(p) for p in pipelines]
    return PipelineListOut(items=items, total=len(items), skip=skip, limit=limit)


@router.get("/{pipeline_id}", response_model=PipelineOut)
async def get_pipeline(
    pipeline_id: uuid.UUID,
    ctx: AuthContext = Depends(require_permission("pipeline.read")),
    db: AsyncSession = Depends(get_db),
) -> PipelineOut:
    pipeline, _ = await ensure_pipeline_permission(db, ctx.user, pipeline_id, "pipeline.read")
    return await PipelineService(db).to_out(pipeline)


@router.patch("/{pipeline_id}", response_model=PipelineOut)
async def update_pipeline(
    pipeline_id: uuid.UUID,
    payload: PipelineUpdate,
    ctx: AuthContext = Depends(require_permission("pipeline.read")),
    db: AsyncSession = Depends(get_db),
) -> PipelineOut:
    pipeline, access = await ensure_pipeline_permission(db, ctx.user, pipeline_id, "pipeline.read")
    permission = "pipeline.pause" if payload.status else "pipeline.create"
    if permission not in access.permissions:
        raise ForbiddenError(f"Missing required permission: {permission}")
    return await PipelineService(db).to_out(await PipelineService(db).update(pipeline.id, payload))


@router.delete("/{pipeline_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pipeline(
    pipeline_id: uuid.UUID,
    ctx: AuthContext = Depends(require_permission("pipeline.read")),
    db: AsyncSession = Depends(get_db),
) -> Response:
    pipeline, access = await ensure_pipeline_permission(db, ctx.user, pipeline_id, "pipeline.read")
    if "project.delete" not in access.permissions:
        raise ForbiddenError("Missing required permission: project.delete")
    await PipelineService(db).delete(pipeline.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{pipeline_id}/run", response_model=PipelineRunOut, status_code=status.HTTP_201_CREATED)
async def run_pipeline(
    pipeline_id: uuid.UUID,
    ctx: AuthContext = Depends(require_permission("pipeline.execute")),
    db: AsyncSession = Depends(get_db),
) -> PipelineRunOut:
    pipeline, _ = await ensure_pipeline_permission(db, ctx.user, pipeline_id, "pipeline.execute")
    run = await PipelineRunRepository(db).create(pipeline_id=pipeline.id, trigger_type="manual")
    AuditService(db).record(
        action="pipeline.run",
        resource_type="pipeline_run",
        resource_id=str(run.id),
        project_id=pipeline.project_id,
        user_id=ctx.user.id,
        details={"pipeline": pipeline.name, "trigger": "manual"},
    )
    await db.commit()

    from app.services.event_bus import broadcast_pipeline_run

    await broadcast_pipeline_run(pipeline.name, "triggered", str(run.id))
    return PipelineRunOut.model_validate(run)


# --------------------------------------------------------------------------- #
# Real execution — Airflow-backed trigger / sync / task graph / logs (Sprint 4)
# --------------------------------------------------------------------------- #
@router.post("/{pipeline_id}/execute")
async def execute_pipeline(
    pipeline_id: uuid.UUID,
    ctx: AuthContext = Depends(require_permission("pipeline.execute")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Trigger a real execution: create a run row and start an Airflow dagRun.

    The generated DAG must have been deployed first (`/deploy/dag`); without
    a live Airflow the response reports `mode: unavailable` and the run row
    fails honestly with the trigger error.
    """
    pipeline, _ = await ensure_pipeline_permission(db, ctx.user, pipeline_id, "pipeline.execute")
    from app.integrations.airflow.service import AirflowService, new_pipeline_run

    run = new_pipeline_run(db, pipeline)
    await db.flush()
    result = await AirflowService(db).trigger(pipeline, run)
    return {"pipelineId": str(pipeline.id), **result}


@router.get("/{pipeline_id}/execution/status")
async def execution_status(
    pipeline_id: uuid.UUID,
    limit: int = Query(10, ge=1, le=50),
    ctx: AuthContext = Depends(require_permission("pipeline.read")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Sync mapped run rows from Airflow and report the execution mode."""
    pipeline, _ = await ensure_pipeline_permission(db, ctx.user, pipeline_id, "pipeline.read")
    from app.integrations.airflow.service import AirflowService

    service = AirflowService(db)
    info = await service.status()
    synced = await service.sync(pipeline, limit=limit)
    return {"pipelineId": str(pipeline.id), "airflow": info, "syncedRuns": synced}


@router.get("/{pipeline_id}/execution/runs/{airflow_run_id}/tasks")
async def execution_tasks(
    pipeline_id: uuid.UUID,
    airflow_run_id: str,
    ctx: AuthContext = Depends(require_permission("pipeline.read")),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Task instances of a mapped dagRun — the Pipeline Manager task graph."""
    pipeline, _ = await ensure_pipeline_permission(db, ctx.user, pipeline_id, "pipeline.read")
    from app.integrations.airflow.service import AirflowService

    return await AirflowService(db).task_instances(pipeline, airflow_run_id)


@router.get("/{pipeline_id}/execution/runs/{airflow_run_id}/tasks/{task_id}/log")
async def execution_task_log(
    pipeline_id: uuid.UUID,
    airflow_run_id: str,
    task_id: str,
    try_number: int = Query(1, ge=1),
    ctx: AuthContext = Depends(require_permission("pipeline.read")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Task log content through the platform log-stream contract."""
    pipeline, _ = await ensure_pipeline_permission(db, ctx.user, pipeline_id, "pipeline.read")
    from app.integrations.airflow.service import AirflowService

    return await AirflowService(db).task_log(pipeline, airflow_run_id, task_id, try_number=try_number)


@router.post("/{pipeline_id}/deploy/dag")
async def deploy_pipeline_dag(
    pipeline_id: uuid.UUID,
    ctx: AuthContext = Depends(require_permission("pipeline.deploy")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Push the generated DAG file into the Airflow dags folder (lead+).

    This is the technical artifact-push used *after* a deploy approval is
    granted — the request-side approval gate stays on `/{pipeline_id}/deploy`.
    The DAG file is rendered from the pipeline's stored builder config and
    written into the shared dags volume the scheduler watches.
    """
    pipeline, _ = await ensure_pipeline_permission(db, ctx.user, pipeline_id, "pipeline.deploy")
    from app.integrations.airflow.service import AirflowService

    artifacts = await PipelineFleetService(db).generate_artifacts(
        pipeline.config or {}, {}
    )
    dag_artifact = next((a for a in artifacts if a["target"] == "airflow_dag"), None)
    if dag_artifact is None:
        from app.core.exceptions import ValidationError

        raise ValidationError("No Airflow DAG artifact could be generated for this pipeline")
    return await AirflowService(db).deploy(pipeline, dag_artifact["content"])


@router.post("/{pipeline_id}/deploy", status_code=status.HTTP_409_CONFLICT)
async def deploy_pipeline(
    pipeline_id: uuid.UUID,
    ctx: AuthContext = Depends(require_permission("pipeline.execute")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Request a production deploy — always routed to the approval queue.

    Permission split (Phase 2.5/2.8): requesting requires ``pipeline.execute``
    (engineer+); the queued approval can only be approved by
    ``approval.approve`` holders (lead+), and executing it requires
    ``pipeline.deploy``. No direct execution path bypasses the gate."""
    pipeline, access = await ensure_pipeline_permission(db, ctx.user, pipeline_id, "pipeline.execute")

    existing = await ApprovalRepository(db).pending_for_pipeline(pipeline.id)
    if existing is not None:
        raise ConflictError(
            "A deploy approval is already pending for this pipeline",
            code="APPROVAL_REQUIRED",
        )

    approval = Approval(
        project_id=pipeline.project_id,
        pipeline_id=pipeline.id,
        request_type=ApprovalType.pipeline_change,
        status=ApprovalStatus.pending,
        summary=f"Production deploy requested for pipeline '{pipeline.name}'.",
        risk_level=RiskLevel.high,
        requested_by=ctx.user.id,
    )
    db.add(approval)
    await db.commit()
    message = "Deploy requires lead/admin sign-off before execution."
    # 409 + error envelope (frontend error parsers) + approval payload.
    return {
        "error": {
            "code": "APPROVAL_REQUIRED",
            "message": message,
            "request_id": None,
        },
        "message": message,
        "status": "approval_required",
        "approval_id": str(approval.id),
        "pipeline_id": str(pipeline.id),
    }
