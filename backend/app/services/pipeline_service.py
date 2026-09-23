"""Pipeline service — pipeline definitions + run history."""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.pipeline import Pipeline
from app.repositories.pipeline_repository import PipelineRepository
from app.repositories.pipeline_run_repository import PipelineRunRepository
from app.repositories.project_repository import ProjectRepository
from app.schemas.pipeline import (
    PipelineCreate,
    PipelineOut,
    PipelineUpdate,
)
from app.schemas.pipeline import (
    PipelineStatus as PipelineStatusSchema,
)


class PipelineService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.pipelines = PipelineRepository(db)
        self.runs = PipelineRunRepository(db)
        self.projects = ProjectRepository(db)

    async def create(self, payload: PipelineCreate, created_by: uuid.UUID | None = None) -> Pipeline:
        project = await self.projects.get(payload.project_id)
        if project is None:
            raise NotFoundError("Project was not found")
        pipeline = await self.pipelines.create(
            project_id=payload.project_id,
            name=payload.name,
            description=payload.description,
            pipeline_type=payload.pipeline_type,
            config=payload.config,
            created_by=created_by,
        )
        await self.db.commit()
        return pipeline

    async def get(self, pipeline_id: uuid.UUID | str) -> Pipeline:
        pipeline = await self.pipelines.get(pipeline_id)
        if pipeline is None:
            raise NotFoundError("Pipeline was not found")
        return pipeline

    async def list(
        self,
        *,
        project_id: uuid.UUID | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Pipeline]:
        if project_id is not None:
            return list(await self.pipelines.list(project_id=project_id, skip=skip, limit=limit))
        return list(await self.pipelines.list(skip=skip, limit=limit))

    async def update(self, pipeline_id: uuid.UUID | str, payload: PipelineUpdate) -> Pipeline:
        pipeline = await self.get(pipeline_id)
        await self.pipelines.update(pipeline, **payload.model_dump(exclude_none=True))
        await self.db.commit()
        return pipeline

    async def delete(self, pipeline_id: uuid.UUID | str) -> None:
        pipeline = await self.get(pipeline_id)
        await self.pipelines.delete(pipeline)
        await self.db.commit()

    async def trigger_run(self, pipeline_id: uuid.UUID | str, trigger_type: str = "manual") -> object:
        pipeline = await self.get(pipeline_id)
        from app.models.pipeline_run import RunTriggerType

        try:
            trigger = RunTriggerType(trigger_type)
        except ValueError:
            trigger = RunTriggerType.manual
        run = await self.runs.create(pipeline_id=pipeline.id, trigger_type=trigger)
        await self.db.commit()
        return run

    async def to_out(self, pipeline: Pipeline) -> PipelineOut:
        run_count = await self.pipelines.run_count(pipeline.id)
        return PipelineOut(
            id=pipeline.id,
            project_id=pipeline.project_id,
            name=pipeline.name,
            description=pipeline.description,
            pipeline_type=pipeline.pipeline_type,
            config=pipeline.config,
            status=PipelineStatusSchema(pipeline.status.value),
            created_by=pipeline.created_by,
            run_count=run_count,
            created_at=pipeline.created_at,
            updated_at=pipeline.updated_at,
        )
