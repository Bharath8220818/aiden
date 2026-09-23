"""FastAPI dependencies: authentication, workspace/project access, permissions.

Phase 2 chain (Phase 2.6 / 2.7):

    Request
      → Authorization header
      → token verification (get_current_user)
      → identity (User)
      → workspace membership (WorkspaceMember)
      → permission check (explicit permission strings, core/permissions.py)
      → endpoint

Access contexts returned by the dependency factories carry the resolved
grants so services can perform further checks without re-querying.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field

from fastapi import Depends, Path
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import ForbiddenError, NotFoundError, UnauthorizedError
from app.core.permissions import (
    permissions_for_system_role,
    permissions_for_workspace_role,
)
from app.core.security import decode_access_token
from app.models.project import Project
from app.models.user import User, UserRole
from app.models.workspace_member import WorkspaceMember, WorkspaceRole
from app.repositories.pipeline_repository import PipelineRepository
from app.repositories.user_repository import UserRepository
from app.repositories.workspace_repository import WorkspaceRepository

# Accepts tokens from the Authorization: Bearer header (no OAuth form dependency).
bearer_scheme = HTTPBearer(auto_error=False)


# --------------------------------------------------------------------------- #
# Authentication
# --------------------------------------------------------------------------- #
async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Resolve the authenticated user from the Bearer token (401 on failure)."""
    auth_error = UnauthorizedError("Could not validate credentials")
    if credentials is None or credentials.credentials is None:
        raise auth_error
    try:
        payload = decode_access_token(credentials.credentials)
    except Exception as exc:
        raise auth_error from exc
    subject = payload.get("sub")
    if not subject:
        raise auth_error
    user = await UserRepository(db).get(subject)
    if user is None or not user.is_active:
        raise auth_error
    return user


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Like get_current_user, but returns None when no/invalid token is sent."""
    if credentials is None or credentials.credentials is None:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
    except Exception:
        return None
    subject = payload.get("sub")
    if not subject:
        return None
    return await UserRepository(db).get(subject)


def require_role(*roles: UserRole):
    """System-role gate (platform-level; not workspace-aware)."""

    async def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise ForbiddenError("You do not have permission to perform this action")
        return user

    return dependency


# --------------------------------------------------------------------------- #
# Access contexts
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class AuthContext:
    """Authenticated identity + the permission set it grants platform-wide."""

    user: User
    permissions: frozenset[str] = field(default_factory=frozenset)

    def has(self, permission: str) -> bool:
        return permission in self.permissions


@dataclass(frozen=True)
class WorkspaceAccess:
    """Membership-resolved access to a single workspace (Phase 2.7)."""

    user: User
    workspace_id: uuid.UUID
    workspace_role: WorkspaceRole | None
    permissions: frozenset[str]

    @property
    def is_member(self) -> bool:
        return self.workspace_role is not None

    def has(self, permission: str) -> bool:
        return permission in self.permissions


@dataclass(frozen=True)
class ProjectAccess:
    """Access to a project resolved through its workspace (Phase 2.7)."""

    user: User
    project: Project
    workspace_id: uuid.UUID
    workspace_role: WorkspaceRole | None
    permissions: frozenset[str]

    def has(self, permission: str) -> bool:
        return permission in self.permissions


# --------------------------------------------------------------------------- #
# Permission-only gate (no resource resolution)
# --------------------------------------------------------------------------- #
def require_permission(permission: str):
    """Dependency factory — requires `permission` from the user's system role.

    For resource-scoped checks use require_workspace_permission /
    require_project_permission / ensure_* helpers instead.
    """

    async def dependency(
        user: User = Depends(get_current_user),
    ) -> AuthContext:
        grants = permissions_for_system_role(user.role)
        if permission not in grants:
            raise ForbiddenError(f"Missing required permission: {permission}")
        return AuthContext(user=user, permissions=grants)

    return dependency


# --------------------------------------------------------------------------- #
# Workspace-scoped access (Phase 2.7)
# --------------------------------------------------------------------------- #
def _effective_permissions(user: User, workspace_role: WorkspaceRole | None) -> frozenset[str]:
    """Grants that apply inside a specific workspace.

    Resource isolation (Phase 2.7): a non-member gets NO workspace-scoped
    permissions — system roles only confer grants within workspaces the user
    belongs to. Platform admins (system role) are the sole exception: they
    hold full permissions across every workspace.
    """
    if workspace_role is None:
        if user.role == UserRole.admin:
            return permissions_for_system_role(user.role)
        return frozenset()
    return permissions_for_system_role(user.role) | permissions_for_workspace_role(workspace_role)


async def resolve_workspace_access(db: AsyncSession, user: User, workspace_id: uuid.UUID) -> WorkspaceAccess:
    """Load workspace + membership; 404 if missing. No permission check."""
    workspace = await WorkspaceRepository(db).get(workspace_id)
    if workspace is None:
        raise NotFoundError("Workspace was not found")
    member = await WorkspaceRepository(db).get_member(workspace.id, user.id)
    return WorkspaceAccess(
        user=user,
        workspace_id=workspace.id,
        workspace_role=member.role if member else None,
        permissions=_effective_permissions(user, member.role if member else None),
    )


def require_workspace_permission(permission: str):
    """Dependency factory for /workspaces/{workspace_id}/... routes.

    Requires `permission` in the user's effective grants for that workspace
    (system role ∪ workspace-role membership). Non-member non-admins get 403.
    """

    async def dependency(
        workspace_id: uuid.UUID = Path(...),
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> WorkspaceAccess:
        access = await resolve_workspace_access(db, user, workspace_id)
        if permission not in access.permissions:
            raise ForbiddenError(f"Missing required permission: {permission}")
        return access

    return dependency


def require_workspace_access():
    """Dependency factory — resolves membership without a permission check."""

    async def dependency(
        workspace_id: uuid.UUID = Path(...),
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> WorkspaceAccess:
        return await resolve_workspace_access(db, user, workspace_id)

    return dependency


async def ensure_workspace_permission(
    db: AsyncSession, user: User, workspace_id: uuid.UUID, permission: str
) -> WorkspaceAccess:
    """Imperative check for routes where the workspace id arrives in a body."""
    access = await resolve_workspace_access(db, user, workspace_id)
    if permission not in access.permissions:
        raise ForbiddenError(f"Missing required permission: {permission}")
    return access


# --------------------------------------------------------------------------- #
# Project-scoped access (Phase 2.7: user → workspace → project → resource)
# --------------------------------------------------------------------------- #
async def resolve_project_access(db: AsyncSession, user: User, project_id: uuid.UUID) -> ProjectAccess:
    project = await db.get(Project, _coerce(project_id))
    if project is None:
        raise NotFoundError("Project was not found")
    ws_access = await resolve_workspace_access(db, user, project.workspace_id)
    return ProjectAccess(
        user=user,
        project=project,
        workspace_id=project.workspace_id,
        workspace_role=ws_access.workspace_role,
        permissions=ws_access.permissions,
    )


def require_project_permission(permission: str):
    """Dependency factory for /projects/{project_id}/... routes."""

    async def dependency(
        project_id: uuid.UUID = Path(...),
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> ProjectAccess:
        access = await resolve_project_access(db, user, project_id)
        if permission not in access.permissions:
            raise ForbiddenError(f"Missing required permission: {permission}")
        return access

    return dependency


async def ensure_project_permission(
    db: AsyncSession, user: User, project_id: uuid.UUID, permission: str
) -> ProjectAccess:
    """Imperative check for routes where the project id arrives in a body."""
    access = await resolve_project_access(db, user, project_id)
    if permission not in access.permissions:
        raise ForbiddenError(f"Missing required permission: {permission}")
    return access


# --------------------------------------------------------------------------- #
# Pipeline-scoped access (project → pipeline chain)
# --------------------------------------------------------------------------- #
async def resolve_pipeline_access(
    db: AsyncSession, user: User, pipeline_id: uuid.UUID
) -> tuple[object, ProjectAccess]:
    """Return (pipeline, project_access); 404 if the pipeline is missing."""
    pipeline = await PipelineRepository(db).get(_coerce(pipeline_id))
    if pipeline is None:
        raise NotFoundError("Pipeline was not found")
    project_access = await resolve_project_access(db, user, pipeline.project_id)
    return pipeline, project_access


async def ensure_pipeline_permission(
    db: AsyncSession, user: User, pipeline_id: uuid.UUID, permission: str
) -> tuple[object, ProjectAccess]:
    pipeline, project_access = await resolve_pipeline_access(db, user, pipeline_id)
    if permission not in project_access.permissions:
        raise ForbiddenError(f"Missing required permission: {permission}")
    return pipeline, project_access


def _coerce(value: uuid.UUID | str) -> uuid.UUID:
    if isinstance(value, uuid.UUID):
        return value
    try:
        return uuid.UUID(str(value))
    except ValueError as exc:
        raise NotFoundError("The requested resource was not found") from exc


def ensure_workspace_membership(access: WorkspaceAccess | ProjectAccess, user: User) -> None:
    """Resource-level rule: only workspace members (or platform admins) pass."""
    if access.workspace_role is None and user.role != UserRole.admin:
        raise ForbiddenError("You do not have access to this workspace")


# --------------------------------------------------------------------------- #
# Membership helpers (used by scoped list endpoints)
# --------------------------------------------------------------------------- #
async def user_workspace_ids(db: AsyncSession, user: User) -> list[uuid.UUID]:
    """Workspace ids the user is a member of."""
    stmt = select(WorkspaceMember.workspace_id).where(WorkspaceMember.user_id == user.id)
    result = await db.execute(stmt)
    return [row[0] for row in result.all()]


__all__ = [
    "AuthContext",
    "ProjectAccess",
    "WorkspaceAccess",
    "bearer_scheme",
    "ensure_pipeline_permission",
    "ensure_project_permission",
    "ensure_workspace_membership",
    "ensure_workspace_permission",
    "get_current_user",
    "get_current_user_optional",
    "require_permission",
    "require_project_permission",
    "require_role",
    "require_workspace_access",
    "require_workspace_permission",
    "resolve_pipeline_access",
    "resolve_project_access",
    "resolve_workspace_access",
    "user_workspace_ids",
]
