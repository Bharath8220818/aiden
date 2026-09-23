"""Workspace + membership repository."""

from __future__ import annotations

import uuid
from collections.abc import Sequence

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember, WorkspaceRole
from app.repositories.base import BaseRepository


class WorkspaceRepository(BaseRepository[Workspace]):
    model = Workspace

    async def get_by_slug(self, slug: str) -> Workspace | None:
        stmt = select(Workspace).where(Workspace.slug == slug)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_with_members(self, *, skip: int = 0, limit: int = 100) -> list[Workspace]:
        stmt = select(Workspace).options(selectinload(Workspace.members)).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def member_count(self, workspace_id: uuid.UUID) -> int:
        stmt = (
            select(func.count())
            .select_from(WorkspaceMember)
            .where(WorkspaceMember.workspace_id == workspace_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none() or 0

    # ------------------------------------------------------------------ #
    # Membership
    # ------------------------------------------------------------------ #
    async def add_member(
        self,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID,
        role: WorkspaceRole = WorkspaceRole.member,
    ) -> WorkspaceMember:
        member = WorkspaceMember(workspace_id=workspace_id, user_id=user_id, role=role)
        self.db.add(member)
        await self.db.flush()
        stmt = (
            select(WorkspaceMember)
            .where(WorkspaceMember.id == member.id)
            .options(selectinload(WorkspaceMember.user))
        )
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def list_members(self, workspace_id: uuid.UUID) -> Sequence[WorkspaceMember]:
        stmt = (
            select(WorkspaceMember)
            .where(WorkspaceMember.workspace_id == workspace_id)
            .options(selectinload(WorkspaceMember.user))
            .order_by(WorkspaceMember.created_at.asc())
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_member(self, workspace_id: uuid.UUID, user_id: uuid.UUID) -> WorkspaceMember | None:
        stmt = select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def remove_member(self, workspace_id: uuid.UUID, user_id: uuid.UUID) -> None:
        member = await self.get_member(workspace_id, user_id)
        if member is not None:
            await self.db.delete(member)
            await self.db.flush()
