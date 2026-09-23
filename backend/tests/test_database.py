"""Database tests (Phase 0.4 / 1.10)."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models import Project, User, UserRole  # noqa: F401
from app.models.base import Base


def test_metadata_registers_all_domain_tables() -> None:
    names = set(Base.metadata.tables.keys())
    for table in (
        "users",
        "workspaces",
        "workspace_members",
        "projects",
        "requirements",
        "architectures",
        "pipelines",
        "pipeline_runs",
        "incidents",
        "approvals",
        "audit_logs",
    ):
        assert table in names, f"missing table {table}"


async def test_create_and_read_user(db_session: AsyncSession) -> None:

    user = User(
        email="db-test@acmedata.io",
        full_name="DB Tester",
        password_hash=hash_password("secret123"),
        role=UserRole.engineer,
    )
    db_session.add(user)
    await db_session.flush()

    result = await db_session.execute(select(User).where(User.email == "db-test@acmedata.io"))
    fetched = result.scalar_one()
    assert fetched.id == user.id
    assert fetched.full_name == "DB Tester"


async def test_workspace_member_relationship(db_session: AsyncSession) -> None:
    from sqlalchemy import select

    from app.models import Workspace, WorkspaceMember, WorkspaceRole

    user = User(
        email="rel-test@acmedata.io",
        full_name="Rel Tester",
        password_hash=hash_password("secret123"),
        role=UserRole.lead,
    )
    db_session.add(user)
    await db_session.flush()

    ws = Workspace(name="RelWorkspace", slug="rel-workspace", description="desc")
    db_session.add(ws)
    await db_session.flush()

    db_session.add(WorkspaceMember(workspace_id=ws.id, user_id=user.id, role=WorkspaceRole.owner))
    await db_session.flush()

    member_result = await db_session.execute(
        select(WorkspaceMember).where(WorkspaceMember.workspace_id == ws.id)
    )
    member = member_result.scalar_one()
    assert member.user_id == user.id
    assert member.workspace_id == ws.id


async def test_project_foreign_key(db_session: AsyncSession) -> None:
    from app.models import Workspace

    ws = Workspace(name="FK Workspace", slug="fk-workspace")
    db_session.add(ws)
    await db_session.flush()

    project = Project(
        workspace_id=ws.id,
        name="FK Project",
        description=None,
    )
    db_session.add(project)
    await db_session.flush()

    result = await db_session.execute(select(Project).where(Project.id == project.id))
    fetched = result.scalar_one()
    assert fetched.workspace_id == ws.id


async def test_engine_configuration_uses_async_driver() -> None:
    from app.core.database import engine

    assert engine.dialect.name in {"sqlite", "postgresql"}
    assert engine.dialect.is_async
