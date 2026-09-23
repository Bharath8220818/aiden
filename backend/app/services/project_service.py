"""Project service."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.architecture import Architecture
from app.models.incident import Incident
from app.models.pipeline import Pipeline
from app.models.project import Project
from app.models.requirement import Requirement
from app.repositories.project_repository import ProjectRepository
from app.repositories.workspace_repository import WorkspaceRepository
from app.schemas.project import ProjectCreate, ProjectOut, ProjectStatus, ProjectUpdate


class ProjectService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.projects = ProjectRepository(db)
        self.workspaces = WorkspaceRepository(db)

    async def create(self, payload: ProjectCreate, created_by: uuid.UUID | None = None) -> Project:
        workspace = await self.workspaces.get(payload.workspace_id)
        if workspace is None:
            raise NotFoundError("Workspace was not found")
        project = await self.projects.create(
            workspace_id=payload.workspace_id,
            name=payload.name,
            description=payload.description,
            created_by=created_by,
        )
        await self.db.commit()
        return project

    async def get(self, project_id: uuid.UUID | str) -> Project:
        project = await self.projects.get(project_id)
        if project is None:
            raise NotFoundError("Project was not found")
        return project

    async def list(
        self, *, workspace_id: uuid.UUID | None = None, skip: int = 0, limit: int = 100
    ) -> list[Project]:
        if workspace_id is not None:
            return list(await self.projects.list_by_workspace(workspace_id, skip=skip, limit=limit))
        return list(await self.projects.list(skip=skip, limit=limit))

    async def update(self, project_id: uuid.UUID | str, payload: ProjectUpdate) -> Project:
        project = await self.get(project_id)
        await self.projects.update(project, **payload.model_dump(exclude_none=True))
        await self.db.commit()
        return project

    async def delete(self, project_id: uuid.UUID | str) -> None:
        project = await self.get(project_id)
        await self.projects.delete(project)
        await self.db.commit()

    # ------------------------------------------------------------------ #
    # Serialization — includes per-project child counts
    # ------------------------------------------------------------------ #
    async def to_out(self, project: Project) -> ProjectOut:
        counts = await self._counts(project.id)
        return ProjectOut(
            id=project.id,
            workspace_id=project.workspace_id,
            name=project.name,
            description=project.description,
            status=ProjectStatus(project.status.value),
            created_by=project.created_by,
            created_at=project.created_at,
            updated_at=project.updated_at,
            **counts,
        )

    async def _counts(self, project_id: uuid.UUID) -> dict:
        from sqlalchemy import func

        async def _count(model, column):
            stmt = select(func.count()).select_from(model).where(column == project_id)
            result = await self.db.execute(stmt)
            return result.scalar_one_or_none() or 0

        return {
            "requirement_count": await _count(Requirement, Requirement.project_id),
            "architecture_count": await _count(Architecture, Architecture.project_id),
            "pipeline_count": await _count(Pipeline, Pipeline.project_id),
            "incident_count": await _count(Incident, Incident.project_id),
        }
