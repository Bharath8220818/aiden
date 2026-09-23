"""Architecture repository."""

from __future__ import annotations

import uuid
from collections.abc import Sequence

from sqlalchemy import select

from app.models.architecture import Architecture
from app.repositories.base import BaseRepository


class ArchitectureRepository(BaseRepository[Architecture]):
    model = Architecture

    async def list_by_project(
        self, project_id: uuid.UUID, *, skip: int = 0, limit: int = 100
    ) -> Sequence[Architecture]:
        return await self.list(project_id=project_id, skip=skip, limit=limit)

    async def get_for_project(self, project_id: uuid.UUID, architecture_id: uuid.UUID) -> Architecture | None:
        stmt = select(Architecture).where(
            Architecture.id == architecture_id,
            Architecture.project_id == project_id,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
