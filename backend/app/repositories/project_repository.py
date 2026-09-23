"""Project repository."""

from __future__ import annotations

import uuid
from collections.abc import Sequence

from sqlalchemy import select

from app.models.project import Project
from app.repositories.base import BaseRepository


class ProjectRepository(BaseRepository[Project]):
    model = Project

    async def list_by_workspace(
        self, workspace_id: uuid.UUID, *, skip: int = 0, limit: int = 100
    ) -> Sequence[Project]:
        return await self.list(workspace_id=workspace_id, skip=skip, limit=limit)

    async def count_by_workspace(self, workspace_id: uuid.UUID) -> int:
        return await self.count(workspace_id=workspace_id)

    async def get_in_workspace(self, workspace_id: uuid.UUID, project_id: uuid.UUID) -> Project | None:
        stmt = select(Project).where(
            Project.id == project_id,
            Project.workspace_id == workspace_id,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
