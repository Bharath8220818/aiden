"""Architecture service — blueprint storage + generation metadata."""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.architecture import Architecture
from app.repositories.architecture_repository import ArchitectureRepository
from app.repositories.project_repository import ProjectRepository
from app.schemas.architecture import (
    ArchitectureCreate,
    ArchitectureOut,
    ArchitectureUpdate,
)
from app.schemas.architecture import (
    ArchitectureStatus as ArchitectureStatusSchema,
)


class ArchitectureService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.architectures = ArchitectureRepository(db)
        self.projects = ProjectRepository(db)

    async def create(self, payload: ArchitectureCreate, created_by: uuid.UUID | None = None) -> Architecture:
        project = await self.projects.get(payload.project_id)
        if project is None:
            raise NotFoundError("Project was not found")
        architecture = await self.architectures.create(
            project_id=payload.project_id,
            name=payload.name,
            description=payload.description,
            created_by=created_by,
        )
        await self.db.commit()
        return architecture

    async def get(self, architecture_id: uuid.UUID | str) -> Architecture:
        architecture = await self.architectures.get(architecture_id)
        if architecture is None:
            raise NotFoundError("Architecture was not found")
        return architecture

    async def list(
        self,
        *,
        project_id: uuid.UUID | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Architecture]:
        if project_id is not None:
            return list(await self.architectures.list_by_project(project_id, skip=skip, limit=limit))
        return list(await self.architectures.list(skip=skip, limit=limit))

    async def update(self, architecture_id: uuid.UUID | str, payload: ArchitectureUpdate) -> Architecture:
        architecture = await self.get(architecture_id)
        await self.architectures.update(architecture, **payload.model_dump(exclude_none=True))
        await self.db.commit()
        return architecture

    async def delete(self, architecture_id: uuid.UUID | str) -> None:
        architecture = await self.get(architecture_id)
        await self.architectures.delete(architecture)
        await self.db.commit()

    async def to_out(self, architecture: Architecture) -> ArchitectureOut:
        return ArchitectureOut(
            id=architecture.id,
            project_id=architecture.project_id,
            name=architecture.name,
            description=architecture.description,
            blueprint=architecture.blueprint,
            status=ArchitectureStatusSchema(architecture.status.value),
            generated_from=architecture.generated_from,
            created_by=architecture.created_by,
            created_at=architecture.created_at,
            updated_at=architecture.updated_at,
        )
