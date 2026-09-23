"""Auth service — authentication + token issuance (Phase 2.9).

Owns the AIDEN-owned JWT flow: password verification → token → session
contract. `UserService` keeps user CRUD; everything session/token-shaped
lives here so the login flow has a single owner.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import InvalidCredentialsError
from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LogoutOut, SessionOut
from app.services.user_service import UserService


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.users = UserRepository(db)
        self.settings = get_settings()

    async def login(self, email: str, password: str) -> SessionOut:
        """Verify credentials and issue a signed session (401 on failure)."""
        user = await self.authenticate(email, password)
        if user is None:
            raise InvalidCredentialsError()
        return await self.session_for(user)

    async def authenticate(self, email: str, password: str) -> User | None:
        user = await self.users.get_by_email(email)
        if user is None or not user.is_active:
            return None
        if not verify_password(password, user.password_hash):
            return None
        return user

    async def session_for(self, user: User) -> SessionOut:
        token = create_access_token(str(user.id))
        expires_at = datetime.now(UTC) + timedelta(minutes=self.settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        return SessionOut(
            user=await UserService(self.db).to_user_out(user),
            token=token,
            expires_at=expires_at,
        )

    async def logout(self) -> LogoutOut:
        # JWTs are stateless — the client discards the token. A denylist /
        # refresh-token store is a later hardening step (see PROJECT_STATUS).
        return LogoutOut(status="ok")
