import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import case, select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.database import get_db
from app.models.audit import AuditLog, AuditSeverity
from app.models.user import User
from app.schemas.audit import AuditLogResponse, AuditListResponse, AuditStats

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=AuditListResponse)
async def list_audit_logs(
    search: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List audit log entries with filtering.

    Supports text search, severity/action/resource-type filters,
    date range, and pagination.
    """
    query = select(AuditLog)

    if search:
        like = f"%{search}%"
        query = query.where(
            or_(
                AuditLog.action.ilike(like),
                AuditLog.resource_type.ilike(like),
                AuditLog.details.ilike(like),
                AuditLog.user_name.ilike(like),
            )
        )

    if severity:
        query = query.where(AuditLog.severity == AuditSeverity(severity))
    if action:
        query = query.where(AuditLog.action.ilike(f"%{action}%"))
    if resource_type:
        query = query.where(AuditLog.resource_type == resource_type)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    if start_date:
        query = query.where(AuditLog.created_at >= start_date)
    if end_date:
        query = query.where(AuditLog.created_at <= end_date)

    # Count total matching
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Compute stats using case/when expressions for boolean-to-integer
    stats_query = select(
        func.count(AuditLog.id).label("total_events"),
        func.sum(case((AuditLog.action.ilike("%create%"), 1), else_=0)).label("creates"),
        func.sum(case((AuditLog.severity == AuditSeverity.ERROR, 1), else_=0)).label("failures"),
        func.sum(case((AuditLog.action.ilike("%auto%"), 1), else_=0)).label("auto_actions"),
    )
    stats_result = (await db.execute(stats_query)).one()
    stats = AuditStats(
        totalEvents=stats_result.total_events or 0,
        creates=stats_result.creates or 0,
        failures=stats_result.failures or 0,
        autoActions=stats_result.auto_actions or 0,
    )

    # Fetch paginated results
    query = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()

    return AuditListResponse(
        logs=[AuditLogResponse.model_validate(log) for log in logs],
        total=total,
        stats=stats,
    )


@router.post("/", response_model=AuditLogResponse, status_code=status.HTTP_201_CREATED)
async def create_audit_log(
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    details: Optional[str] = None,
    severity: str = "info",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually create an audit log entry.

    Most audit entries are created internally by the system, but this
    endpoint allows explicit logging when needed (e.g. from the frontend
    or external integrations).
    """
    log = AuditLog(
        user_id=current_user.id,
        user_name=current_user.full_name,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details,
        severity=AuditSeverity(severity),
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log
