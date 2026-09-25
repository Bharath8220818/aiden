"""Auth endpoints — login/logout/me (frontend contract: camelCase session)."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import InvalidCredentialsError
from app.models.user import User
from app.schemas.auth import LoginRequest, LogoutOut, SessionOut
from app.schemas.user import UserOut
from app.services.audit import AuditService
from app.services.auth_service import AuthService
from app.services.user_service import UserService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=SessionOut)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> SessionOut:
    service = AuthService(db)
    # authenticate() first so failed logins audit nothing; then one transaction
    # issues the session and records the login (§8: LOGIN is an audited action).
    user = await service.authenticate(payload.email, payload.password)
    if user is None:
        raise InvalidCredentialsError()
    session = await service.session_for(user)
    AuditService(db).record(
        action="auth.login",
        resource_type="session",
        user_id=user.id,
        details={"email": payload.email},
    )
    await db.commit()
    return session


@router.post("/logout", response_model=LogoutOut)
async def logout() -> LogoutOut:
    return await AuthService(None).logout()


@router.get("/me", response_model=UserOut)
async def me(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    return await UserService(db).to_user_out(user)
