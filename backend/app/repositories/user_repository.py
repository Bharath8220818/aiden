"""User repository."""

from __future__ import annotations

from sqlalchemy import func, select

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    model = User

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(func.lower(User.email) == email.strip().lower())
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def exists_email(self, email: str) -> bool:
        return await self.get_by_email(email) is not None

    async def create_user(
        self,
        *,
        email: str,
        full_name: str,
        password_hash: str,
        role: str = "engineer",
        is_active: bool = True,
    ) -> User:
        return await self.create(
            email=email.strip().lower(),
            full_name=full_name.strip(),
            password_hash=password_hash,
            role=role,
            is_active=is_active,
        )
