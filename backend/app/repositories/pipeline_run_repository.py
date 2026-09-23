"""PipelineRun repository."""

from __future__ import annotations

import uuid
from collections.abc import Sequence

from sqlalchemy import func, select

from app.models.pipeline_run import PipelineRun, RunStatus
from app.repositories.base import BaseRepository


class PipelineRunRepository(BaseRepository[PipelineRun]):
    model = PipelineRun

    async def list_by_pipeline(
        self, pipeline_id: uuid.UUID, *, skip: int = 0, limit: int = 100
    ) -> Sequence[PipelineRun]:
        stmt = (
            select(PipelineRun)
            .where(PipelineRun.pipeline_id == pipeline_id)
            .order_by(PipelineRun.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def latest(self, pipeline_id: uuid.UUID) -> PipelineRun | None:
        stmt = (
            select(PipelineRun)
            .where(PipelineRun.pipeline_id == pipeline_id)
            .order_by(PipelineRun.created_at.desc())
            .limit(1)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def count_by_status(self, pipeline_id: uuid.UUID, status: RunStatus) -> int:
        stmt = (
            select(func.count())
            .select_from(PipelineRun)
            .where(PipelineRun.pipeline_id == pipeline_id, PipelineRun.status == status)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one() or 0
