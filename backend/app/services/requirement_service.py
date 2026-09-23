"""Requirement service — multimodal intent + Open Data Contract workflow."""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.requirement import Requirement, RequirementStatus
from app.repositories.project_repository import ProjectRepository
from app.repositories.requirement_repository import RequirementRepository
from app.schemas.requirement import (
    RequirementCreate,
    RequirementOut,
    RequirementUpdate,
)
from app.schemas.requirement import (
    RequirementStatus as RequirementStatusSchema,
)


class RequirementService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.requirements = RequirementRepository(db)
        self.projects = ProjectRepository(db)

    async def create(
        self,
        payload: RequirementCreate,
        created_by: uuid.UUID | None = None,
        *,
        intent_analysis: dict | None = None,
        data_contract: dict | None = None,
    ) -> Requirement:
        project = await self.projects.get(payload.project_id)
        if project is None:
            raise NotFoundError("Project was not found")
        requirement = await self.requirements.create(
            project_id=payload.project_id,
            title=payload.title,
            description=payload.description,
            created_by=created_by,
        )
        if intent_analysis is not None or data_contract is not None:
            await self.requirements.update_contract(
                requirement,
                intent_analysis=intent_analysis,
                data_contract=data_contract,
                status=RequirementStatus.validated,
            )
        await self.db.commit()
        return requirement

    async def get(self, requirement_id: uuid.UUID | str) -> Requirement:
        requirement = await self.requirements.get(requirement_id)
        if requirement is None:
            raise NotFoundError("Requirement was not found")
        return requirement

    async def list(
        self,
        *,
        project_id: uuid.UUID | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Requirement]:
        if project_id is not None:
            return list(await self.requirements.list_by_project(project_id, skip=skip, limit=limit))
        return list(await self.requirements.list(skip=skip, limit=limit))

    async def update(self, requirement_id: uuid.UUID | str, payload: RequirementUpdate) -> Requirement:
        requirement = await self.get(requirement_id)
        await self.requirements.update(requirement, **payload.model_dump(exclude_none=True))
        await self.db.commit()
        return requirement

    async def delete(self, requirement_id: uuid.UUID | str) -> None:
        requirement = await self.get(requirement_id)
        await self.requirements.delete(requirement)
        await self.db.commit()

    async def save_contract(
        self,
        requirement_id: uuid.UUID | str,
        *,
        intent_analysis: dict | None = None,
        data_contract: dict | None = None,
        status: RequirementStatus | None = None,
    ) -> Requirement:
        requirement = await self.get(requirement_id)
        await self.requirements.update_contract(
            requirement,
            intent_analysis=intent_analysis,
            data_contract=data_contract,
            status=status,
        )
        await self.db.commit()
        return requirement

    async def to_out(self, requirement: Requirement) -> RequirementOut:
        return RequirementOut(
            id=requirement.id,
            project_id=requirement.project_id,
            title=requirement.title,
            description=requirement.description,
            intent_analysis=requirement.intent_analysis,
            data_contract=requirement.data_contract,
            status=RequirementStatusSchema(requirement.status.value),
            created_by=requirement.created_by,
            created_at=requirement.created_at,
            updated_at=requirement.updated_at,
        )
