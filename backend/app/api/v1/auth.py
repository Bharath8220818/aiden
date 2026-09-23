"""Auth endpoints — login/logout/me (frontend contract: camelCase session)."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import LoginRequest, LogoutOut, SessionOut
from app.schemas.user import UserOut
from app.services.auth_service import AuthService
from app.services.user_service import UserService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=SessionOut)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> SessionOut:
    return await AuthService(db).login(payload.email, payload.password)


@router.post("/logout", response_model=LogoutOut)
async def logout() -> LogoutOut:
    return await AuthService(None).logout()


@router.get("/me", response_model=UserOut)
async def me(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    return await UserService(db).to_user_out(user)
