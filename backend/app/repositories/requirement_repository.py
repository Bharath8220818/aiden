"""Requirement repository."""

from __future__ import annotations

import uuid
from collections.abc import Sequence

from sqlalchemy import select

from app.models.requirement import Requirement, RequirementStatus
from app.repositories.base import BaseRepository


class RequirementRepository(BaseRepository[Requirement]):
    model = Requirement

    async def list_by_project(
        self, project_id: uuid.UUID, *, skip: int = 0, limit: int = 100
    ) -> Sequence[Requirement]:
        return await self.list(project_id=project_id, skip=skip, limit=limit)

    async def get_for_project(self, project_id: uuid.UUID, requirement_id: uuid.UUID) -> Requirement | None:
        stmt = select(Requirement).where(
            Requirement.id == requirement_id,
            Requirement.project_id == project_id,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def update_contract(
        self,
        requirement: Requirement,
        *,
        intent_analysis: dict | None = None,
        data_contract: dict | None = None,
        status: RequirementStatus | None = None,
    ) -> Requirement:
        if intent_analysis is not None:
            requirement.intent_analysis = intent_analysis
        if data_contract is not None:
            requirement.data_contract = data_contract
        if status is not None:
            requirement.status = status
        await self.db.flush()
        await self.db.refresh(requirement)
        return requirement
