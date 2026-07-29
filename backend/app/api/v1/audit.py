import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import cast, select, func, or_, String
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.database import get_db
from app.models.audit import AuditLogEntry
from app.models.user import User
from app.schemas.audit import AuditLogResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/")
async def list_audit_logs(
    search: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """List audit log entries with filtering.

    Supports text search, action/resource-type filters,
    date range, and pagination.
    """
    query = select(AuditLogEntry)

    if search:
        like = f"%{search}%"
        query = query.where(
            or_(
                AuditLogEntry.action.ilike(like),
                AuditLogEntry.resource_type.ilike(like),
                cast(AuditLogEntry.details, String).ilike(like),
            )
        )

    if action:
        query = query.where(AuditLogEntry.action.ilike(f"%{action}%"))
    if resource_type:
        query = query.where(AuditLogEntry.resource_type == resource_type)
    if user_id:
        query = query.where(AuditLogEntry.user_id == user_id)
    if start_date:
        query = query.where(AuditLogEntry.created_at >= start_date)
    if end_date:
        query = query.where(AuditLogEntry.created_at <= end_date)

    # Count total matching
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Fetch paginated results
    query = query.order_by(AuditLogEntry.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()

    return {
        "logs": [AuditLogResponse.model_validate(log) for log in logs],
        "total": total,
    }


@router.post("/", response_model=AuditLogResponse, status_code=status.HTTP_201_CREATED)
async def create_audit_log(
    action: str,
    resource_type: str,
    resource_id: Optional[int] = None,
    details: Optional[dict] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually create an audit log entry.

    Most audit entries are created internally by the system, but this
    endpoint allows explicit logging when needed (e.g. from the frontend
    or external integrations).
    """
    log = AuditLogEntry(
        user_id=current_user.id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details or {},
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log
