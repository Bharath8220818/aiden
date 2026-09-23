"""Users endpoints — admin-gated administration + open self-registration."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import AuthContext, get_current_user, require_permission
from app.models.user import User
from app.schemas.user import UserCreate, UserListOut, UserOut
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    """Open self-registration — the only unauthenticated user-creation route."""
    service = UserService(db)
    user = await service.create_user(payload)
    return await service.to_user_out(user)


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    ctx: AuthContext = Depends(require_permission("user.create")),
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    service = UserService(db)
    user = await service.create_user(payload)
    return await service.to_user_out(user)


@router.get("/me", response_model=UserOut)
async def get_me(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    return await UserService(db).to_user_out(user)


@router.get("", response_model=UserListOut)
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    ctx: AuthContext = Depends(require_permission("user.read")),
    db: AsyncSession = Depends(get_db),
) -> UserListOut:
    service = UserService(db)
    users = await service.list_users(skip=skip, limit=limit)
    items = [await service.to_user_out(u) for u in users]
    return UserListOut(items=items, total=len(items))
