"""AIDEN Monitoring API — unified health view across pipelines, connectors, quality, incidents."""
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.database import get_db
from app.models.pipeline import Pipeline, PipelineStatus
from app.models.execution import PipelineExecution, ExecutionStatus
from app.models.incident import Incident, IncidentStatus
from app.models.data_quality_result import DataQualityResult
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/overview")
async def monitoring_overview(
    project_id: int = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregate health snapshot: pipelines, executions, incidents, quality."""
    last_24h = datetime.now(timezone.utc) - timedelta(hours=24)

    # Pipelines
    pipeline_q = select(Pipeline).where(Pipeline.is_active == True)  # noqa: E712
    if project_id:
        pipeline_q = pipeline_q.where(Pipeline.project_id == project_id) if hasattr(Pipeline, "project_id") else pipeline_q
    pipelines = (await db.execute(pipeline_q)).scalars().all()

    status_counts = {"healthy": 0, "warning": 0, "failed": 0, "draft": 0}
    for p in pipelines:
        s = p.status.value if p.status else "draft"
        if s in ("success", "running", "pending"):
            status_counts["healthy"] += 1
        elif s == "failed":
            status_counts["failed"] += 1
        elif s == "paused":
            status_counts["warning"] += 1
        else:
            status_counts["draft"] += 1

    # Executions (last 24h)
    exec_total = (await db.execute(
        select(func.count(PipelineExecution.id)).where(PipelineExecution.started_at >= last_24h)
    )).scalar() or 0
    exec_failed = (await db.execute(
        select(func.count(PipelineExecution.id)).where(
            PipelineExecution.started_at >= last_24h,
            PipelineExecution.status == ExecutionStatus.FAILED,
        )
    )).scalar() or 0
    exec_success = (await db.execute(
        select(func.count(PipelineExecution.id)).where(
            PipelineExecution.started_at >= last_24h,
            PipelineExecution.status == ExecutionStatus.SUCCESS,
        )
    )).scalar() or 0

    # Open incidents by severity
    open_incidents = (await db.execute(
        select(Incident).where(Incident.status.in_([IncidentStatus.OPEN, IncidentStatus.INVESTIGATING, IncidentStatus.IDENTIFIED]))
    )).scalars().all()
    incident_counts = {"critical": 0, "error": 0, "warning": 0, "info": 0}
    for i in open_incidents:
        sev = i.severity.value if i.severity else "info"
        incident_counts[sev] = incident_counts.get(sev, 0) + 1

    # Data quality (last 50 results)
    quality_q = select(DataQualityResult).order_by(DataQualityResult.evaluated_at.desc()).limit(50)
    if project_id:
        quality_q = quality_q.where(DataQualityResult.project_id == project_id)
    quality_rows = (await db.execute(quality_q)).scalars().all()
    quality_pass_rate = (
        sum(1 for q in quality_rows if q.status == "passed") / len(quality_rows)
        if quality_rows else 1.0
    )

    return {
        "pipelines": {
            "total": len(pipelines),
            **status_counts,
        },
        "executions_24h": {
            "total": exec_total,
            "success": exec_success,
            "failed": exec_failed,
            "success_rate": round(exec_success / exec_total, 3) if exec_total else 1.0,
        },
        "incidents": {
            "open": len(open_incidents),
            **incident_counts,
        },
        "data_quality": {
            "pass_rate": round(quality_pass_rate, 4),
            "samples": len(quality_rows),
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/quality")
async def quality_results(
    project_id: int = Query(None),
    pipeline_id: int = Query(None),
    status_filter: str = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Recent data-quality results."""
    query = select(DataQualityResult).order_by(DataQualityResult.evaluated_at.desc()).limit(limit)
    if project_id:
        query = query.where(DataQualityResult.project_id == project_id)
    if pipeline_id:
        query = query.where(DataQualityResult.pipeline_id == pipeline_id)
    if status_filter:
        query = query.where(DataQualityResult.status == status_filter)
    rows = (await db.execute(query)).scalars().all()
    return [q.to_dict() for q in rows]


@router.get("/health")
async def monitoring_health(
    current_user: User = Depends(get_current_user),
):
    """Liveness probe for the monitoring subsystem itself."""
    return {"status": "healthy", "subsystem": "monitoring", "timestamp": datetime.now(timezone.utc).isoformat()}
