"""Projects CRUD endpoints — auth required, workspace-scoped (Phase 2.7)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import (
    ensure_project_permission,
    ensure_workspace_permission,
    get_current_user,
    require_permission,
    user_workspace_ids,
)
from app.core.exceptions import ForbiddenError
from app.models.user import User, UserRole
from app.schemas.project import ProjectCreate, ProjectListOut, ProjectOut, ProjectUpdate
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    ctx=Depends(require_permission("project.create")),
    db: AsyncSession = Depends(get_db),
) -> ProjectOut:
    """Project creation is checked against the target workspace: the creator
    needs `project.create` there (or platform admin / workspace owner)."""
    await ensure_workspace_permission(db, ctx.user, payload.workspace_id, "project.create")
    service = ProjectService(db)
    project = await service.create(payload, created_by=ctx.user.id)
    # §8 observability: audit in the same transaction as the action
    from app.services.audit import audit_row

    db.add(
        audit_row(
            action="project.create",
            resource_type="project",
            resource_id=str(project.id),
            workspace_id=payload.workspace_id,
            user_id=ctx.user.id,
            details={"name": payload.name},
        )
    )
    await db.commit()
    return await service.to_out(project)


@router.get("", response_model=ProjectListOut)
async def list_projects(
    workspace_id: uuid.UUID | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectListOut:
    """Membership-scoped listing (Phase 2.7): non-admins only see projects in
    workspaces they belong to; `workspace_id` further filters the result."""
    service = ProjectService(db)
    if user.role != UserRole.admin:
        ws_ids = set(await user_workspace_ids(db, user))
        if workspace_id is not None and workspace_id not in ws_ids:
            return ProjectListOut(items=[], total=0, skip=skip, limit=limit)

    projects = await service.list(
        workspace_id=workspace_id,
        skip=0 if user.role != UserRole.admin else skip,
        limit=limit if user.role == UserRole.admin else 10_000,
    )
    if user.role != UserRole.admin:
        projects = [p for p in projects if p.workspace_id in ws_ids]
        projects = projects[skip : skip + limit]
    items = [await service.to_out(p) for p in projects]
    return ProjectListOut(items=items, total=len(items), skip=skip, limit=limit)


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectOut:
    access = await ensure_project_permission(db, user, project_id, "project.read")
    if access.workspace_role is None and user.role != UserRole.admin:
        raise ForbiddenError("You do not have access to this workspace")
    service = ProjectService(db)
    return await service.to_out(access.project)


@router.put("/{project_id}", response_model=ProjectOut)
@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: uuid.UUID,
    payload: ProjectUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectOut:
    access = await ensure_project_permission(db, user, project_id, "project.update")
    service = ProjectService(db)
    return await service.to_out(await service.update(access.project.id, payload))


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    access = await ensure_project_permission(db, user, project_id, "project.delete")
    await ProjectService(db).delete(access.project.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
