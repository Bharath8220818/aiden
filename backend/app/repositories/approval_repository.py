"""Approval repository — pending sign-offs for autonomous/sensitive actions."""

from __future__ import annotations

import uuid
from collections.abc import Sequence

from sqlalchemy import select

from app.models.approval import Approval, ApprovalStatus
from app.repositories.base import BaseRepository


class ApprovalRepository(BaseRepository[Approval]):
    model = Approval

    async def pending_for_pipeline(self, pipeline_id: uuid.UUID) -> Approval | None:
        """Latest still-pending approval for a pipeline (dedup guard)."""
        stmt = (
            select(Approval)
            .where(
                Approval.pipeline_id == pipeline_id,
                Approval.status == ApprovalStatus.pending,
            )
            .order_by(Approval.created_at.desc())
            .limit(1)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_pending(self, *, limit: int = 50) -> Sequence[Approval]:
        stmt = (
            select(Approval)
            .where(Approval.status == ApprovalStatus.pending)
            .order_by(Approval.created_at.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()
