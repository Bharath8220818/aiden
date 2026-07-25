import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.database import get_db
from app.models.approval import Approval, ApprovalAction, ApprovalStatus, RiskLevel
from app.models.user import User
from app.schemas.approval import (
    ApprovalCreate,
    ApprovalActionCreate,
    ApprovalActionResponse,
    ApprovalResponse,
    ApprovalListResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/", response_model=ApprovalResponse, status_code=status.HTTP_201_CREATED)
async def create_approval(
    request: ApprovalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new approval request for a schema change or deployment."""
    approval = Approval(
        title=request.title,
        description=request.description,
        risk=RiskLevel(request.risk),
        created_by=current_user.id,
        created_by_name=current_user.full_name,
        change=request.change,
        resource_type=request.resource_type,
        resource_name=request.resource_name,
    )
    db.add(approval)
    await db.commit()
    await db.refresh(approval)

    # Record the creation action
    action = ApprovalAction(
        approval_id=approval.id,
        action="comment",
        user_id=current_user.id,
        user_name=current_user.full_name,
        comment=f"Created approval request: {request.title}",
    )
    db.add(action)
    await db.commit()

    return approval


@router.get("/", response_model=ApprovalListResponse)
async def list_approvals(
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List approval requests. Optionally filter by status."""
    query = select(Approval).order_by(Approval.created_at.desc())

    if status_filter:
        query = query.where(Approval.status == ApprovalStatus(status_filter))

    total_q = select(func.count(Approval.id))
    if status_filter:
        total_q = total_q.where(Approval.status == ApprovalStatus(status_filter))
    total = (await db.execute(total_q)).scalar() or 0

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    approvals = result.scalars().all()

    return ApprovalListResponse(
        approvals=[ApprovalResponse.model_validate(a) for a in approvals],
        total=total,
    )


@router.get("/{approval_id}", response_model=ApprovalResponse)
async def get_approval(
    approval_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single approval request by ID."""
    result = await db.execute(select(Approval).where(Approval.id == approval_id))
    approval = result.scalar_one_or_none()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")
    return approval


@router.post("/{approval_id}/approve", response_model=ApprovalResponse)
async def approve_approval(
    approval_id: int,
    request: ApprovalActionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Approve a pending approval request."""
    result = await db.execute(select(Approval).where(Approval.id == approval_id))
    approval = result.scalar_one_or_none()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")
    if approval.status != ApprovalStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Cannot approve approval with status '{approval.status.value}'")

    approval.status = ApprovalStatus.APPROVED
    approval.reviewed_by = current_user.id
    approval.reviewed_by_name = current_user.full_name
    approval.review_comment = request.comment
    approval.reviewed_at = datetime.utcnow()

    action = ApprovalAction(
        approval_id=approval.id,
        action="approve",
        user_id=current_user.id,
        user_name=current_user.full_name,
        comment=request.comment,
    )
    db.add(action)
    await db.commit()
    await db.refresh(approval)
    return approval


@router.post("/{approval_id}/reject", response_model=ApprovalResponse)
async def reject_approval(
    approval_id: int,
    request: ApprovalActionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reject a pending approval request."""
    result = await db.execute(select(Approval).where(Approval.id == approval_id))
    approval = result.scalar_one_or_none()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")
    if approval.status != ApprovalStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Cannot reject approval with status '{approval.status.value}'")

    approval.status = ApprovalStatus.REJECTED
    approval.reviewed_by = current_user.id
    approval.reviewed_by_name = current_user.full_name
    approval.review_comment = request.comment
    approval.reviewed_at = datetime.utcnow()

    action = ApprovalAction(
        approval_id=approval.id,
        action="reject",
        user_id=current_user.id,
        user_name=current_user.full_name,
        comment=request.comment,
    )
    db.add(action)
    await db.commit()
    await db.refresh(approval)
    return approval


@router.get("/{approval_id}/actions", response_model=list[ApprovalActionResponse])
async def get_approval_actions(
    approval_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the action history for an approval request."""
    result = await db.execute(
        select(ApprovalAction)
        .where(ApprovalAction.approval_id == approval_id)
        .order_by(ApprovalAction.created_at.desc())
    )
    return result.scalars().all()
