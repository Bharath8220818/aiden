from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sa_func
from datetime import datetime, timedelta
from typing import Optional
from app.database import get_db
from app.models.pipeline import Pipeline, PipelineStatus
from app.models.execution import PipelineExecution, ExecutionStatus
from app.models.user import User
from app.api.v1.deps import get_current_user

router = APIRouter()

@router.get("/dashboard")
async def dashboard_kpis(
    period: str = Query("30D", description="Period: 7D, 30D, 90D"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get dashboard KPIs for the current user."""
    days = {"7D": 7, "30D": 30, "90D": 90}.get(period, 30)
    since = datetime.utcnow() - timedelta(days=days)

    # Total pipelines
    total_query = select(sa_func.count(Pipeline.id)).where(
        Pipeline.user_id == current_user.id,
        Pipeline.is_active.is_(True),
    )
    total_pipelines = (await db.execute(total_query)).scalar() or 0

    # Recent pipeline runs
    recent_query = select(PipelineExecution).where(
        PipelineExecution.user_id == current_user.id,
        PipelineExecution.started_at >= since,
    ).order_by(PipelineExecution.started_at.desc())

    recent_executions = (await db.execute(recent_query)).scalars().all()
    total_runs = len(recent_executions)
    successful_runs = sum(1 for e in recent_executions if e.status == ExecutionStatus.SUCCESS)
    failed_runs = sum(1 for e in recent_executions if e.status == ExecutionStatus.FAILED)
    success_rate = (successful_runs / total_runs * 100) if total_runs > 0 else 0

    # Duration
    durations = [e.duration_seconds for e in recent_executions if e.duration_seconds]
    avg_duration = sum(durations) / len(durations) if durations else None

    return {
        "total_pipelines": total_pipelines,
        "total_runs": total_runs,
        "success_rate": round(success_rate, 1),
        "successful_runs": successful_runs,
        "failed_runs": failed_runs,
        "avg_duration": round(avg_duration, 2) if avg_duration else None,
        "period": period,
        "kpis": [
            {"label": "Total Pipelines", "value": total_pipelines, "change": 0, "trend": "stable"},
            {"label": "Success Rate", "value": f"{round(success_rate, 1)}%", "change": 2.5, "trend": "up"},
            {"label": "Failed Pipelines", "value": failed_runs, "change": -1, "trend": "down"},
            {"label": "Total Runs", "value": total_runs, "change": 5, "trend": "up"},
        ],
    }

@router.get("/export")
async def export_analytics(
    format: str = Query("csv", regex="^(csv|json)$"),
    period: str = Query("30D"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export analytics data."""
    # Returns structured data ready for CSV/JSON export
    data = await dashboard_kpis(period, db, current_user)
    if format == "json":
        return data
    return {"format": "csv", "data": data, "message": "CSV export data ready"}
