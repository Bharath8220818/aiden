"""User service — authentication + user CRUD."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DuplicateEmailError, NotFoundError
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember
from app.repositories.user_repository import UserRepository
from app.schemas.user import SystemRole, UserCreate, UserOut


class UserService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.users = UserRepository(db)

    # ------------------------------------------------------------------ #
    # Authentication
    # ------------------------------------------------------------------ #
    async def authenticate(self, email: str, password: str) -> User | None:
        user = await self.users.get_by_email(email)
        if user is None or not user.is_active:
            return None
        if not verify_password(password, user.password_hash):
            return None
        return user

    # ------------------------------------------------------------------ #
    # CRUD
    # ------------------------------------------------------------------ #
    async def create_user(self, payload: UserCreate) -> User:
        if await self.users.exists_email(payload.email):
            raise DuplicateEmailError()
        user = await self.users.create_user(
            email=payload.email,
            full_name=payload.full_name,
            password_hash=hash_password(payload.password),
            role=payload.role.value,
        )
        await self.db.commit()
        return user

    async def get_user(self, user_id: uuid.UUID | str) -> User:
        user = await self.users.get(user_id)
        if user is None:
            raise NotFoundError("User was not found")
        return user

    async def get_user_by_email(self, email: str) -> User | None:
        return await self.users.get_by_email(email)

    async def list_users(self, *, skip: int = 0, limit: int = 100) -> list[User]:
        return list(await self.users.list(skip=skip, limit=limit))

    # ------------------------------------------------------------------ #
    # Serialization
    # ------------------------------------------------------------------ #
    async def primary_workspace_name(self, user_id: uuid.UUID) -> str | None:
        stmt = (
            select(Workspace.name)
            .select_from(WorkspaceMember)
            .join(Workspace, Workspace.id == WorkspaceMember.workspace_id)
            .where(WorkspaceMember.user_id == user_id)
            .order_by(WorkspaceMember.created_at.asc())
            .limit(1)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def to_user_out(self, user: User) -> UserOut:
        ws_name = await self.primary_workspace_name(user.id)
        return UserOut(
            id=user.id,
            name=user.full_name,
            email=user.email,
            system_role=SystemRole(user.role.value),
            role_title=user.role_title,
            status=user.status.value,
            workspace_name=ws_name,
        )
