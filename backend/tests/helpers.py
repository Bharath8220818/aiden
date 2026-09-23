"""Shared test helpers — minimal entity seeding utilities."""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models import Project, User, UserRole, Workspace, WorkspaceMember, WorkspaceRole


async def seed_user(
    db: AsyncSession,
    *,
    email: str | None = None,
    role: UserRole = UserRole.engineer,
    password: str = "secret123",
) -> User:
    """Create and persist a user with a unique email."""
    email = email or f"user-{uuid.uuid4().hex[:8]}@acmedata.io"
    user = User(
        email=email,
        full_name=f"User {email.split('@')[0]}",
        password_hash=hash_password(password),
        role=role,
    )
    db.add(user)
    await db.commit()
    return user


async def seed_workspace_with_member(
    db: AsyncSession,
    user: User,
    *,
    member_role: WorkspaceRole = WorkspaceRole.member,
    with_project: bool = False,
) -> tuple[Workspace, Project | None]:
    """Create a workspace with `user` as a member; optionally add a project."""
    ws = Workspace(name=f"WS {uuid.uuid4().hex[:8]}", slug=f"ws-{uuid.uuid4().hex[:12]}")
    db.add(ws)
    await db.flush()
    db.add(WorkspaceMember(workspace_id=ws.id, user_id=user.id, role=member_role))
    project: Project | None = None
    if with_project:
        project = Project(workspace_id=ws.id, name=f"Project {uuid.uuid4().hex[:6]}", created_by=user.id)
        db.add(project)
    await db.commit()
    return ws, project
