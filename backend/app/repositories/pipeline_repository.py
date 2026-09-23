"""Pipeline repository."""

from __future__ import annotations

import uuid

from sqlalchemy import func, select

from app.models.pipeline import Pipeline
from app.models.pipeline_run import PipelineRun
from app.repositories.base import BaseRepository


class PipelineRepository(BaseRepository[Pipeline]):
    model = Pipeline

    async def run_count(self, pipeline_id: uuid.UUID) -> int:
        stmt = select(func.count()).select_from(PipelineRun).where(PipelineRun.pipeline_id == pipeline_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none() or 0

    async def list_runs(
        self, pipeline_id: uuid.UUID, *, skip: int = 0, limit: int = 100
    ) -> list[PipelineRun]:
        stmt = (
            select(PipelineRun)
            .where(PipelineRun.pipeline_id == pipeline_id)
            .order_by(PipelineRun.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def create_run(self, pipeline_id: uuid.UUID, *, trigger_type: str = "manual") -> PipelineRun:
        run = PipelineRun(pipeline_id=pipeline_id, trigger_type=trigger_type)
        self.db.add(run)
        await self.db.flush()
        await self.db.refresh(run)
        return run
