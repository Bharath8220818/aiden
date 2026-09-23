"""Overview dashboard aggregate tests (Phase 2 contract: GET /overview).

Validates the payload against the frontend contract in
frontend/src/features/overview/types.ts (OverviewDashboardData) — including
the exact camelCase key names the axios client consumes verbatim.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models import (
    Approval,
    Architecture,
    Incident,
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

# Top-level keys the frontend OverviewDashboardData requires, verbatim.
CONTRACT_KEYS = {
    "healthServices",
    "pipelineMetrics",
    "insights",
    "recentActivities",
    "engineeringCycle",
}


async def _seed_domain(db: AsyncSession) -> None:
    """User → Workspace → Project → Architecture → Pipeline → Runs + Incident + Approval."""
    lead = User(
        email=f"overview-lead-{uuid.uuid4().hex[:8]}@acmedata.io",
        full_name="Overview Lead",
        password_hash=hash_password("secret123"),
        role=UserRole.lead,
    )
    ws = Workspace(name="Overview WS", slug=f"overview-ws-{uuid.uuid4().hex[:8]}")
    db.add_all([lead, ws])
    await db.flush()
    db.add(WorkspaceMember(workspace_id=ws.id, user_id=lead.id, role=WorkspaceRole.owner))

    project = Project(workspace_id=ws.id, name="Overview Project", created_by=lead.id)
    db.add(project)
    await db.flush()

    db.add(
        Architecture(
            project_id=project.id,
            name="Overview Blueprint",
            blueprint={"nodes": [], "edges": []},
            status="validated",
            created_by=lead.id,
        )
    )

    active = Pipeline(
        project_id=project.id,
        name="orders_cdc_v1",
        pipeline_type="streaming",
        status="active",
        created_by=lead.id,
    )
    paused = Pipeline(
        project_id=project.id,
        name="inventory_sync",
        pipeline_type="batch",
        status="paused",
        created_by=lead.id,
    )
    db.add_all([active, paused])
    await db.flush()

    now = datetime.now(UTC).replace(tzinfo=None)
    db.add_all(
        [
            # current 24h window
            PipelineRun(
                pipeline_id=active.id,
                status=RunStatus.success,
                created_at=now - timedelta(hours=2),
                started_at=now - timedelta(hours=2),
                finished_at=now - timedelta(hours=2),
                duration_ms=252_000,
                rows_processed=1_400_000,
            ),
            PipelineRun(
                pipeline_id=active.id,
                status=RunStatus.running,
                created_at=now - timedelta(minutes=10),
                started_at=now - timedelta(minutes=10),
                rows_processed=420_000,
            ),
            PipelineRun(
                pipeline_id=active.id,
                status=RunStatus.failed,
                created_at=now - timedelta(hours=1),
                started_at=now - timedelta(hours=1),
                error="Quality gate failed: uniqueness violation on order_id",
            ),
            PipelineRun(
                pipeline_id=active.id, status=RunStatus.queued, created_at=now - timedelta(minutes=5)
            ),
            # previous 24h window (drives trend percentages)
            PipelineRun(
                pipeline_id=active.id, status=RunStatus.success, created_at=now - timedelta(hours=30)
            ),
            PipelineRun(pipeline_id=active.id, status=RunStatus.failed, created_at=now - timedelta(hours=36)),
            PipelineRun(pipeline_id=active.id, status=RunStatus.failed, created_at=now - timedelta(hours=40)),
        ]
    )

    incident = Incident(
        project_id=project.id,
        title="orders_cdc_v1 — quality gate failure",
        severity="high",
        status="investigating",
        detection_source="quality_gate",
        root_cause={"category": "data_quality", "confidence": 0.91},
        proposed_fix={"summary": "Add dedup guard", "risk_level": "medium"},
    )
    db.add(incident)
    await db.flush()
    db.add(
        Approval(
            project_id=project.id,
            incident_id=incident.id,
            request_type="healing_deploy",
            status="pending",
            summary="Deploy dedup guard.",
            risk_level="medium",
            requested_by=lead.id,
        )
    )
    await db.commit()


async def test_overview_contract_shape(client: httpx.AsyncClient, db_session: AsyncSession) -> None:
    await _seed_domain(db_session)

    resp = await client.get("/api/v1/overview")
    assert resp.status_code == 200
    body = resp.json()

    assert set(body.keys()) == CONTRACT_KEYS

    # healthServices: cards present, exact camelCase fields
    services = body["healthServices"]
    assert services, "health cards should never be empty"
    for card in services:
        assert set(card.keys()) == {
            "id",
            "name",
            "status",
            "statusLabel",
            "metric",
            "metricLabel",
            "iconName",
            "latency",
        }
    by_id = {c["id"]: c for c in services}
    assert "srv-postgres" in by_id
    assert by_id["srv-postgres"]["status"] in {"healthy", "error"}

    # pipelineMetrics: exactly the four cards the UI grid expects
    metrics = {m["id"]: m for m in body["pipelineMetrics"]}
    assert set(metrics.keys()) == {
        "metric-running",
        "metric-successful",
        "metric-failed",
        "metric-queued",
    }
    assert metrics["metric-successful"]["value"] == 1  # current 24h window only
    assert metrics["metric-failed"]["value"] == 1
    assert metrics["metric-failed"]["trend"] == "-50.0%"  # 1 now vs 2 previous
    assert metrics["metric-running"]["value"] == 1
    assert metrics["metric-queued"]["value"] == 1
    assert metrics["metric-failed"]["isPositive"] is True  # failures dropped

    # insights: real incident surfaces, plus paused/failed/approval signals
    insights = body["insights"]
    assert insights, "seeded incident should produce at least one insight"
    for ins in insights:
        assert set(ins.keys()) == {
            "id",
            "type",
            "severity",
            "title",
            "message",
            "affectedResources",
            "actionLabel",
            "actionRoute",
            "timestamp",
        }
    assert any(i["id"].startswith("ins-incident-") for i in insights)
    assert any(i["id"] == "ins-paused" for i in insights)
    assert any(i["id"] == "ins-approvals" for i in insights)

    # recentActivities: ALL recent runs (not windowed) joined to pipeline names
    activities = body["recentActivities"]
    assert len(activities) == 7  # 7 runs seeded across both windows
    for act in activities:
        assert set(act.keys()) == {
            "id",
            "time",
            "pipeline",
            "event",
            "status",
            "duration",
            "recordsProcessed",
        }
        assert act["pipeline"] in {"orders_cdc_v1", "inventory_sync"}
    by_pipeline = {a["status"] for a in activities}
    assert "completed" in by_pipeline and "started" in by_pipeline
    assert any(a["recordsProcessed"] == "1.4M rows" for a in activities)

    # engineeringCycle: the fixed 12-stage loop
    cycle = body["engineeringCycle"]
    assert [s["step"] for s in cycle] == list(range(1, 13))
    for step in cycle:
        assert set(step.keys()) == {
            "step",
            "name",
            "description",
            "status",
            "iconName",
            "autonomousAgent",
        }
    by_name = {s["name"]: s["status"] for s in cycle}
    assert by_name["UNDERSTAND"] == "active"  # no requirements seeded yet
    assert by_name["DESIGN"] == "completed"  # architecture seeded
    assert by_name["DIAGNOSE"] == "completed"  # incident has root_cause
    assert by_name["REPAIR"] == "completed"  # incident has proposed_fix
    assert by_name["TEST"] == "queued"


async def test_overview_all_clear_on_empty_db(client: httpx.AsyncClient) -> None:
    """Empty database → healthy cards + the all-clear insight, no errors."""
    resp = await client.get("/api/v1/overview")
    assert resp.status_code == 200
    body = resp.json()

    assert set(body.keys()) == CONTRACT_KEYS
    assert body["pipelineMetrics"] == [] or all(m["value"] == 0 for m in body["pipelineMetrics"])
    insights = body["insights"]
    assert len(insights) == 1
    assert insights[0]["id"] == "ins-allclear"
    assert insights[0]["severity"] == "success"
    assert body["recentActivities"] == []
    statuses = {s["name"]: s["status"] for s in body["engineeringCycle"]}
    assert statuses["UNDERSTAND"] == "active"  # loop waiting on first input
    assert statuses["DESIGN"] == "queued"


async def test_overview_matches_frontend_mock_schema_fields(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    """Spot-check enum values against the TS union types (status literals)."""
    await _seed_domain(db_session)

    resp = await client.get("/api/v1/overview")
    body = resp.json()

    allowed_service_status = {"healthy", "warning", "error", "active"}
    allowed_metric_status = {"running", "successful", "failed", "queued"}
    allowed_insight_severity = {"critical", "warning", "info", "success"}
    allowed_activity_status = {
        "completed",
        "started",
        "warning",
        "auto_healed",
        "schema_updated",
        "failed",
    }
    allowed_step_status = {"completed", "active", "queued"}

    assert all(c["status"] in allowed_service_status for c in body["healthServices"])
    assert all(m["statusType"] in allowed_metric_status for m in body["pipelineMetrics"])
    assert all(i["severity"] in allowed_insight_severity for i in body["insights"])
    assert all(a["status"] in allowed_activity_status for a in body["recentActivities"])
    assert all(s["status"] in allowed_step_status for s in body["engineeringCycle"])
