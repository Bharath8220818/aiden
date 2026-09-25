"""Platform pulse endpoint tests — public aggregate stats for the landing demo.

Validates that the pulse reports REAL aggregates (seeded rows are counted),
stays public (no auth), and is honest about availability. The cache is reset
around each test so seeded data is always visible.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models import (
    Incident,
    IncidentSeverity,
    IncidentStatus,
    Pipeline,
    PipelineRun,
    Project,
    RunStatus,
    User,
    UserRole,
    Workspace,
    WorkspaceMember,
    WorkspaceRole,
)
from app.services.platform_pulse_service import _pulse_cache


@pytest.fixture(autouse=True)
def _reset_pulse_cache():
    _pulse_cache["data"] = None
    yield
    _pulse_cache["data"] = None


async def _seed_pipeline(db: AsyncSession) -> Pipeline:
    """Seed user → workspace → project → pipeline; return the pipeline."""
    lead = User(
        email=f"pulse-{uuid.uuid4().hex[:8]}@acmedata.io",
        full_name="Pulse Lead",
        password_hash=hash_password("secret123"),
        role=UserRole.lead,
    )
    ws = Workspace(name="Pulse WS", slug=f"pulse-ws-{uuid.uuid4().hex[:8]}")
    db.add_all([lead, ws])
    await db.flush()
    db.add(WorkspaceMember(workspace_id=ws.id, user_id=lead.id, role=WorkspaceRole.owner))
    project = Project(workspace_id=ws.id, name="Pulse Project", created_by=lead.id)
    db.add(project)
    await db.flush()
    pipeline = Pipeline(
        project_id=project.id,
        name=f"pulse_pipeline_{uuid.uuid4().hex[:6]}",
        pipeline_type="batch",
        status="active",
        created_by=lead.id,
    )
    db.add(pipeline)
    await db.flush()
    return pipeline


async def test_pulse_is_public_and_honest_when_empty(client) -> None:
    resp = await client.get("/api/v1/platform/pulse")
    assert resp.status_code == 200
    body = resp.json()
    assert body["database"] == "available"
    assert body["agents"]["registered"] == 11
    assert body["windowHours"] == 24
    assert body["runs"]["total24h"] >= 0


async def test_pulse_counts_real_runs(client, db_session: AsyncSession) -> None:
    now = datetime.now(UTC).replace(tzinfo=None)
    pipeline = await _seed_pipeline(db_session)
    db_session.add(
        PipelineRun(
            pipeline_id=pipeline.id,
            status=RunStatus.success,
            created_at=now - timedelta(hours=1),
            rows_processed=418_233,
            duration_ms=372_000,
        )
    )
    db_session.add(
        PipelineRun(pipeline_id=pipeline.id, status=RunStatus.failed, created_at=now - timedelta(hours=2))
    )
    await db_session.commit()

    resp = await client.get("/api/v1/platform/pulse")
    assert resp.status_code == 200
    body = resp.json()
    assert body["runs"]["total24h"] >= 2
    assert body["runs"]["success24h"] >= 1
    assert body["runs"]["failed24h"] >= 1
    assert body["runs"]["last"]["status"] in {"success", "failed"}
    assert body["runs"]["last"]["rowsProcessed"] == 418_233
    assert body["runs"]["successRate"] == 50.0


async def test_pulse_counts_incidents(client, db_session: AsyncSession) -> None:
    pipeline = await _seed_pipeline(db_session)
    db_session.add(
        Incident(
            project_id=pipeline.project_id,
            title="Pulse incident",
            detection_source="monitoring_agent",
            severity=IncidentSeverity.high,
            status=IncidentStatus.detected,
        )
    )
    await db_session.commit()

    resp = await client.get("/api/v1/platform/pulse")
    body = resp.json()
    assert body["incidents"]["open"] >= 1


async def test_pulse_cache_holds_within_ttl(client, db_session: AsyncSession) -> None:
    await _seed_pipeline(db_session)
    await db_session.commit()

    first = (await client.get("/api/v1/platform/pulse")).json()
    await _seed_pipeline(db_session)
    await db_session.commit()
    second = (await client.get("/api/v1/platform/pulse")).json()
    assert second == first  # cached within TTL — public hammering can't hit the DB
