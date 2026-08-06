import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.database import get_db
from app.models.approval import ApprovalRequest, ApprovalAction, ApprovalStatus, ApprovalRisk
from app.models.user import User
from app.schemas.approval import (
    ApprovalRequestCreate,
    ApprovalActionCreate,
    ApprovalActionResponse,
    ApprovalResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/", response_model=ApprovalResponse, status_code=status.HTTP_201_CREATED)
async def create_approval(
    request: ApprovalRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new approval request for a schema change or deployment."""
    approval = ApprovalRequest(
        pipeline_id=request.pipeline_id,
        requested_by=current_user.id,
        action=request.action,
        details=request.details or {},
        risk_score=ApprovalRisk(request.risk_score),
        status=ApprovalStatus.PENDING,
    )
    db.add(approval)
    await db.commit()
    await db.refresh(approval)

    # Record the creation action
    action = ApprovalAction(
        approval_id=approval.id,
        action_by=current_user.id,
        action_type="comment",
        comment=f"Created approval request: {request.action}",
    )
    db.add(action)
    await db.commit()

    return approval


@router.get("/")
async def list_approvals(
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """List approval requests. Optionally filter by status."""
    query = (
        select(ApprovalRequest)
        .options(selectinload(ApprovalRequest.actions))
        .order_by(ApprovalRequest.created_at.desc())
    )

    if status_filter:
        query = query.where(ApprovalRequest.status == ApprovalStatus(status_filter))

    total_q = select(func.count(ApprovalRequest.id))
    if status_filter:
        total_q = total_q.where(ApprovalRequest.status == ApprovalStatus(status_filter))
    total = (await db.execute(total_q)).scalar() or 0

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    approvals = result.scalars().all()

    return {
        "approvals": [ApprovalResponse.model_validate(a) for a in approvals],
        "total": total,
    }


@router.get("/{approval_id}", response_model=ApprovalResponse)
async def get_approval(
    approval_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single approval request by ID."""
    result = await db.execute(
        select(ApprovalRequest)
        .options(selectinload(ApprovalRequest.actions))
        .where(ApprovalRequest.id == approval_id)
    )
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
    result = await db.execute(
        select(ApprovalRequest)
        .options(selectinload(ApprovalRequest.actions))
        .where(ApprovalRequest.id == approval_id)
    )
    approval = result.scalar_one_or_none()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")
    if approval.status != ApprovalStatus.PENDING:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve request with status '{approval.status.value}'",
        )

    approval.status = ApprovalStatus.APPROVED
    approval.reviewed_by = current_user.id
    approval.review_comment = request.comment
    approval.reviewed_at = datetime.now(timezone.utc)

    action = ApprovalAction(
        approval_id=approval.id,
        action_by=current_user.id,
        action_type="approve",
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
    result = await db.execute(
        select(ApprovalRequest)
        .options(selectinload(ApprovalRequest.actions))
        .where(ApprovalRequest.id == approval_id)
    )
    approval = result.scalar_one_or_none()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")
    if approval.status != ApprovalStatus.PENDING:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reject request with status '{approval.status.value}'",
        )

    approval.status = ApprovalStatus.REJECTED
    approval.reviewed_by = current_user.id
    approval.review_comment = request.comment
    approval.reviewed_at = datetime.now(timezone.utc)

    action = ApprovalAction(
        approval_id=approval.id,
        action_by=current_user.id,
        action_type="reject",
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
