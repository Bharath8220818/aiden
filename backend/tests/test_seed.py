"""Seed-data tests — counts, membership, FK constraints, auth hashing (1.8/1.9)."""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_password
from app.models import (
    Approval,
    Architecture,
    AuditLog,
    Incident,
    Pipeline,
    PipelineRun,
    Project,
    Requirement,
    User,
    Workspace,
    WorkspaceMember,
)
from scripts.seed_database import seed


async def _run_seed(db: AsyncSession) -> None:
    await seed(db)


async def test_seed_counts_and_pipeline_names(db_session: AsyncSession) -> None:
    await _run_seed(db_session)

    assert (await db_session.scalar(select(func.count()).select_from(User))) == 4
    assert (await db_session.scalar(select(func.count()).select_from(Workspace))) == 4
    assert (await db_session.scalar(select(func.count()).select_from(Project))) == 6
    assert (await db_session.scalar(select(func.count()).select_from(Requirement))) == 2
    assert (await db_session.scalar(select(func.count()).select_from(Architecture))) == 1
    assert (await db_session.scalar(select(func.count()).select_from(Incident))) == 1
    assert (await db_session.scalar(select(func.count()).select_from(Approval))) == 1
    assert (await db_session.scalar(select(func.count()).select_from(AuditLog))) == 1

    pipelines = list((await db_session.execute(select(Pipeline.name))).scalars())
    assert set(pipelines) == {
        "orders_cdc_v1",
        "sales_daily_pipeline",
        "fraud_stream_processor",
        "customer_360_etl",
        "inventory_sync",
    }
    runs = await db_session.scalar(select(func.count()).select_from(PipelineRun))
    assert runs == 5 * 3

    ws_names = set((await db_session.execute(select(Workspace.name))).scalars())
    assert ws_names == {
        "Acme Data Platform",
        "Retail Analytics",
        "Customer 360",
        "Real-Time Fraud Detection",
    }


async def test_seed_membership_relationships(db_session: AsyncSession) -> None:
    await _run_seed(db_session)

    # every workspace has admin + lead owners
    rows = list(
        (
            await db_session.execute(
                select(WorkspaceMember, Workspace).join(
                    Workspace, WorkspaceMember.workspace_id == Workspace.id
                )
            )
        ).all()
    )
    assert len(rows) == 4 * 2 + 4 + 2  # owner×2 per ws + engineer + viewer in 2 ws

    # admin can reach its workspace through membership
    stmt = (
        select(Workspace)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
        .join(User, User.id == WorkspaceMember.user_id)
        .where(User.email == "admin@acmedata.io")
    )
    workspaces = list((await db_session.execute(stmt)).scalars())
    assert len(workspaces) == 4


async def test_seed_passwords_are_hashed(db_session: AsyncSession) -> None:
    await seed(db_session)
    admin = (await db_session.execute(select(User).where(User.email == "admin@acmedata.io"))).scalar_one()
    assert admin.password_hash != "admin123"
    assert verify_password("admin123", admin.password_hash)
    assert not verify_password("wrong", admin.password_hash)


async def test_foreign_key_constraints(db_session: AsyncSession) -> None:
    await _run_seed(db_session)

    # project with non-existent workspace → FK violation
    bad = Project(workspace_id=uuid.uuid4(), name="Orphan Project")
    db_session.add(bad)
    with pytest.raises(IntegrityError):
        await db_session.flush()
    await db_session.rollback()

    # requirement with non-existent project → FK violation
    await db_session.rollback()
    bad_req = Requirement(project_id=uuid.uuid4(), title="Orphan Req")
    db_session.add(bad_req)
    with pytest.raises(IntegrityError):
        await db_session.flush()
