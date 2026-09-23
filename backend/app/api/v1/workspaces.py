"""Workspaces CRUD endpoints — auth required, permissions enforced (Phase 2).

Every route flows through: token → current user → workspace membership →
explicit permission (Phase 2.6). Listing is membership-scoped: users see
workspaces they belong to; admins see all.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import (
    get_current_user,
    require_permission,
    require_workspace_access,
    require_workspace_permission,
    user_workspace_ids,
)
from app.core.exceptions import ForbiddenError
from app.models.user import User, UserRole
from app.schemas.workspace import (
    WorkspaceCreate,
    WorkspaceListOut,
    WorkspaceMemberCreate,
    WorkspaceMemberOut,
    WorkspaceOut,
    WorkspaceUpdate,
)
from app.services.workspace_service import WorkspaceService

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


def _assert_can_view(access) -> None:
    if not access.is_member and access.user.role != UserRole.admin:
        raise ForbiddenError("You do not have access to this workspace")


@router.post("", response_model=WorkspaceOut, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    payload: WorkspaceCreate,
    ctx=Depends(require_permission("workspace.create")),
    db: AsyncSession = Depends(get_db),
) -> WorkspaceOut:
    """Any authenticated user with `workspace.create` (engineer+) may create;
    the creator is recorded as workspace owner."""
    service = WorkspaceService(db)
    workspace = await service.create(payload, owner=ctx.user)
    return await service.to_out(workspace)


@router.get("", response_model=WorkspaceListOut)
async def list_workspaces(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WorkspaceListOut:
    service = WorkspaceService(db)
    if user.role == UserRole.admin:
        workspaces = list(await service.list(skip=skip, limit=limit))
    else:
        ws_ids = set(await user_workspace_ids(db, user))
        all_visible = [ws for ws in await service.list(skip=0, limit=10_000) if ws.id in ws_ids]
        workspaces = all_visible[skip : skip + limit]
    items = [await service.to_out(w) for w in workspaces]
    return WorkspaceListOut(items=items, total=len(items), skip=skip, limit=limit)


@router.get("/{workspace_id}", response_model=WorkspaceOut)
async def get_workspace(
    access=Depends(require_workspace_access()),
    db: AsyncSession = Depends(get_db),
) -> WorkspaceOut:
    """Members see their workspace; platform admins see everything.
    Non-member non-admins get 403 (existence is not hidden, but access is)."""
    _assert_can_view(access)
    service = WorkspaceService(db)
    return await service.to_out(await service.get(access.workspace_id))


@router.put("/{workspace_id}", response_model=WorkspaceOut)
async def update_workspace(
    payload: WorkspaceUpdate,
    access=Depends(require_workspace_permission("workspace.update")),
    db: AsyncSession = Depends(get_db),
) -> WorkspaceOut:
    service = WorkspaceService(db)
    return await service.to_out(await service.update(access.workspace_id, payload))


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    access=Depends(require_workspace_permission("workspace.delete")),
    db: AsyncSession = Depends(get_db),
) -> Response:
    await WorkspaceService(db).delete(access.workspace_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{workspace_id}/members", response_model=list[WorkspaceMemberOut])
async def list_members(
    access=Depends(require_workspace_access()),
    db: AsyncSession = Depends(get_db),
) -> list[WorkspaceMemberOut]:
    _assert_can_view(access)
    return await WorkspaceService(db).list_members(access.workspace_id)


@router.post(
    "/{workspace_id}/members",
    response_model=WorkspaceMemberOut,
    status_code=status.HTTP_201_CREATED,
)
async def add_member(
    payload: WorkspaceMemberCreate,
    access=Depends(require_workspace_permission("workspace.update")),
    db: AsyncSession = Depends(get_db),
) -> WorkspaceMemberOut:
    return await WorkspaceService(db).add_member(access.workspace_id, payload)


@router.delete("/{workspace_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    user_id: uuid.UUID,
    access=Depends(require_workspace_permission("workspace.update")),
    db: AsyncSession = Depends(get_db),
) -> Response:
    await WorkspaceService(db).remove_member(access.workspace_id, user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
