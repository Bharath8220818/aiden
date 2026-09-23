"""Workspace service."""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceRole
from app.repositories.workspace_repository import WorkspaceRepository
from app.schemas.workspace import (
    WorkspaceCreate,
    WorkspaceMemberCreate,
    WorkspaceMemberOut,
    WorkspaceOut,
    WorkspaceUpdate,
)


class WorkspaceService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.workspaces = WorkspaceRepository(db)

    async def create(self, payload: WorkspaceCreate, owner: User | None = None) -> Workspace:
        slug = payload.slug or self._slugify(payload.name)
        if await self.workspaces.get_by_slug(slug):
            raise ConflictError(f"A workspace with slug '{slug}' already exists")

        workspace = await self.workspaces.create(
            name=payload.name,
            slug=slug,
            description=payload.description,
        )
        if owner is not None:
            await self.workspaces.add_member(workspace.id, owner.id, WorkspaceRole.owner)
        await self.db.commit()
        return workspace

    async def list(self, *, skip: int = 0, limit: int = 100) -> list[Workspace]:
        return await self.workspaces.list_with_members(skip=skip, limit=limit)

    async def get(self, workspace_id: uuid.UUID | str) -> Workspace:
        workspace = await self.workspaces.get(workspace_id)
        if workspace is None:
            raise NotFoundError("Workspace was not found")
        return workspace

    async def update(self, workspace_id: uuid.UUID | str, payload: WorkspaceUpdate) -> Workspace:
        workspace = await self.get(workspace_id)
        updates = {}
        if payload.name is not None:
            updates["name"] = payload.name
        if payload.description is not None:
            updates["description"] = payload.description
        if payload.slug is not None:
            slug = self._slugify(payload.slug)
            existing = await self.workspaces.get_by_slug(slug)
            if existing and existing.id != workspace.id:
                raise ConflictError(f"A workspace with slug '{slug}' already exists")
            updates["slug"] = slug
        await self.workspaces.update(workspace, **updates)
        await self.db.commit()
        return workspace

    async def delete(self, workspace_id: uuid.UUID | str) -> None:
        workspace = await self.get(workspace_id)
        await self.workspaces.delete(workspace)
        await self.db.commit()

    # ------------------------------------------------------------------ #
    # Serialization
    # ------------------------------------------------------------------ #
    async def to_out(self, workspace: Workspace) -> WorkspaceOut:
        member_count = await self.workspaces.member_count(workspace.id)
        return WorkspaceOut(
            id=workspace.id,
            name=workspace.name,
            slug=workspace.slug,
            description=workspace.description,
            member_count=member_count,
            created_at=workspace.created_at,
            updated_at=workspace.updated_at,
        )

    # ------------------------------------------------------------------ #
    # Membership
    # ------------------------------------------------------------------ #
    async def list_members(self, workspace_id: uuid.UUID | str) -> list[WorkspaceMemberOut]:
        workspace = await self.get(workspace_id)
        members = await self.workspaces.list_members(workspace.id)
        return [
            WorkspaceMemberOut(
                id=m.id,
                workspace_id=m.workspace_id,
                user_id=m.user_id,
                user_email=m.user.email if m.user else None,
                user_name=m.user.full_name if m.user else None,
                role=m.role,
                created_at=m.created_at,
            )
            for m in members
        ]

    async def add_member(
        self,
        workspace_id: uuid.UUID | str,
        payload: WorkspaceMemberCreate,
    ) -> WorkspaceMemberOut:
        workspace = await self.get(workspace_id)
        existing = await self.workspaces.get_member(workspace.id, payload.user_id)
        if existing is not None:
            raise ConflictError("User is already a member of this workspace")
        member = await self.workspaces.add_member(workspace.id, payload.user_id, payload.role)
        await self.db.commit()
        return WorkspaceMemberOut(
            id=member.id,
            workspace_id=member.workspace_id,
            user_id=member.user_id,
            user_email=member.user.email if member.user else None,
            user_name=member.user.full_name if member.user else None,
            role=member.role,
            created_at=member.created_at,
        )

    async def remove_member(self, workspace_id: uuid.UUID | str, user_id: uuid.UUID | str) -> None:
        workspace = await self.get(workspace_id)
        await self.workspaces.remove_member(workspace.id, uuid.UUID(str(user_id)))
        await self.db.commit()

    @staticmethod
    def _slugify(value: str) -> str:
        import re

        slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
        return slug or "workspace"
