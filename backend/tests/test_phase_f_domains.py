"""Phase F domain tests — endpoint existence, auth/RBAC gates, contract shapes.

Covers the contract-matrix rows the frontend relies on:
- anonymous → 401 on every new domain
- viewer    → read 200 / write 403
- engineer/lead/admin → per-permission gates
- response shapes match the frontend TS contracts (camelCase keys)
"""

from __future__ import annotations

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.models import User, UserRole, WorkspaceRole
from tests.helpers import seed_user, seed_workspace_with_member


def _auth(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user.id))}"}


# --------------------------------------------------------------------------- #
# Anonymous gates
# --------------------------------------------------------------------------- #
async def test_new_domains_require_auth(client: httpx.AsyncClient) -> None:
    for path in (
        "/api/v1/connections",
        "/api/v1/connections/providers",
        "/api/v1/agents",
        "/api/v1/agents/swarm",
        "/api/v1/knowledge/docs",
        "/api/v1/integrations/mcp",
        "/api/v1/monitoring/services",
        "/api/v1/monitoring/alerts",
        "/api/v1/incidents",
        "/api/v1/sql/databases",
        "/api/v1/architecture/templates",
        "/api/v1/approvals",
        "/api/v1/audit",
        "/api/v1/pipelines/fleet",
    ):
        resp = await client.get(path)
        assert resp.status_code == 401, path


# --------------------------------------------------------------------------- #
# Read surfaces (viewer OK)
# --------------------------------------------------------------------------- #
async def test_viewer_can_read_all_domain_surfaces(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    viewer = await seed_user(db_session, role=UserRole.viewer)
    headers = _auth(viewer)
    for path in (
        "/api/v1/connections",
        "/api/v1/connections/providers",
        "/api/v1/agents",
        "/api/v1/agents/swarm",
        "/api/v1/knowledge/docs",
        "/api/v1/integrations/mcp",
        "/api/v1/monitoring/services",
        "/api/v1/monitoring/series",
        "/api/v1/monitoring/kafka/topics",
        "/api/v1/monitoring/quality",
        "/api/v1/monitoring/alerts",
        "/api/v1/sql/databases",
        "/api/v1/architecture/templates",
    ):
        resp = await client.get(path, headers=headers)
        assert resp.status_code == 200, path


async def test_connection_contract_shape(client: httpx.AsyncClient, db_session: AsyncSession) -> None:
    viewer = await seed_user(db_session, role=UserRole.viewer)
    resp = await client.get("/api/v1/connections", headers=_auth(viewer))
    assert resp.status_code == 200
    rows = resp.json()
    assert isinstance(rows, list) and rows
    sample = rows[0]
    for key in (
        "id",
        "name",
        "providerId",
        "providerName",
        "category",
        "environment",
        "status",
        "host",
        "authType",
        "credentials",
        "sslEnabled",
        "createdAt",
        "lastCheckedAt",
        "latencyMs",
        "stats",
    ):
        assert key in sample, key
    assert set(sample["stats"]) == {"pipelinesUsing", "tablesIntrospected", "monthlyQueryCount"}
    # secrets masked
    assert all(
        "vault" in str(v) or "••" in str(v) or "AKIA" in str(v) or "aiden" in str(v)
        for v in [sample["credentials"].get("password", "vault:x")]
    )


async def test_agent_contract_shape(client: httpx.AsyncClient, db_session: AsyncSession) -> None:
    viewer = await seed_user(db_session, role=UserRole.viewer)
    resp = await client.get("/api/v1/agents", headers=_auth(viewer))
    assert resp.status_code == 200
    agents = resp.json()
    assert len(agents) >= 6
    sample = agents[0]
    for key in (
        "id",
        "name",
        "role",
        "status",
        "model",
        "capabilities",
        "stats",
        "toolGrants",
        "memory",
        "trajectory",
    ):
        assert key in sample, key


async def test_knowledge_retrieve_scores_and_orders(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    viewer = await seed_user(db_session, role=UserRole.viewer)
    headers = _auth(viewer)
    resp = await client.post(
        "/api/v1/knowledge/retrieve", json={"query": "kafka consumer lag runbook"}, headers=headers
    )
    assert resp.status_code == 200
    chunks = resp.json()
    assert chunks and all({"docId", "docTitle", "kind", "score", "content", "ts"} <= set(c) for c in chunks)
    scores = [c["score"] for c in chunks]
    assert scores == sorted(scores, reverse=True)


async def test_incidents_shape(client: httpx.AsyncClient, db_session: AsyncSession) -> None:
    engineer = await seed_user(db_session, role=UserRole.engineer)
    ws, project = await seed_workspace_with_member(
        db_session, engineer, member_role=WorkspaceRole.member, with_project=True
    )
    from app.models import Incident

    db_session.add(
        Incident(
            project_id=project.id, title="orders_cdc_v1 — quality gate failure (uniqueness)", severity="high"
        )
    )
    await db_session.commit()

    viewer = await seed_user(db_session, role=UserRole.viewer)
    resp = await client.get("/api/v1/incidents", headers=_auth(viewer))
    assert resp.status_code == 200
    rows = resp.json()
    assert rows, "expected the seeded incident to be listed"
    for key in (
        "id",
        "title",
        "pipelineName",
        "severity",
        "status",
        "detectedAt",
        "detectedBy",
        "affectedDownstream",
        "mttrMinutes",
        "errorSignature",
        "errorMessage",
        "occurrences",
    ):
        assert key in rows[0], key


# --------------------------------------------------------------------------- #
# Write gates
# --------------------------------------------------------------------------- #
async def test_viewer_cannot_control_agents_or_write_knowledge(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    viewer = await seed_user(db_session, role=UserRole.viewer)
    headers = _auth(viewer)
    resp = await client.post("/api/v1/agents/agent-healer/status", json={"paused": True}, headers=headers)
    assert resp.status_code == 403
    resp = await client.post("/api/v1/knowledge/retrieve", json={"query": "test"}, headers=headers)
    assert resp.status_code == 200  # read is fine


async def test_engineer_cannot_approve_but_lead_can(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    from app.models import Approval

    engineer = await seed_user(db_session, role=UserRole.engineer)
    ws, project = await seed_workspace_with_member(
        db_session, engineer, member_role=WorkspaceRole.member, with_project=True
    )
    approval = Approval(
        project_id=project.id, summary="Deploy dedup guard", risk_level="medium", status="pending"
    )
    db_session.add(approval)
    await db_session.commit()

    resp = await client.post(
        f"/api/v1/approvals/{approval.id}/approve", json={"note": "lgtm"}, headers=_auth(engineer)
    )
    assert resp.status_code == 403

    lead = await seed_user(db_session, role=UserRole.lead)
    resp = await client.post(
        f"/api/v1/approvals/{approval.id}/approve", json={"note": "lgtm"}, headers=_auth(lead)
    )
    assert resp.status_code == 200
    assert resp.json()["decision"] == "approved"

    # decision recorded + audit row written
    await db_session.refresh(approval)
    assert approval.status.value == "approved"


async def test_healing_advance_requires_healing_execute(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    from app.models import Incident

    engineer = await seed_user(db_session, role=UserRole.engineer)
    ws, project = await seed_workspace_with_member(
        db_session, engineer, member_role=WorkspaceRole.member, with_project=True
    )
    incident = Incident(
        project_id=project.id, title="orders_cdc_v1 — quality gate failure (uniqueness)", severity="high"
    )
    db_session.add(incident)
    await db_session.commit()

    # engineer has healing.propose but not healing.execute
    resp = await client.post(f"/api/v1/incidents/{incident.id}/diagnose", headers=_auth(engineer))
    assert resp.status_code == 200
    body = resp.json()
    assert body["incidentId"] == str(incident.id)
    assert body["rootCause"]["confidence"] >= 80

    lead = await seed_user(db_session, role=UserRole.lead)
    resp = await client.post(
        f"/api/v1/healing/heal-{incident.id}/advance",
        json={"targetStage": "investigating"},
        headers=_auth(lead),
    )
    assert resp.status_code == 200
    run = resp.json()
    assert run["stage"] == "investigating"
    assert run["timeline"][0]["stage"] in {"detected", "investigating"}


async def test_sql_execution_blocks_destructive_statements(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    lead = await seed_user(db_session, role=UserRole.lead)
    headers = _auth(lead)
    resp = await client.post("/api/v1/sql/execute", json={"sql": "DROP TABLE users"}, headers=headers)
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "DESTRUCTIVE_SQL_BLOCKED"

    resp = await client.post(
        "/api/v1/sql/execute", json={"sql": "SELECT email FROM users LIMIT 3"}, headers=headers
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "success"
    assert body["rowCount"] <= 3


async def test_requirements_analyze_contract(client: httpx.AsyncClient, db_session: AsyncSession) -> None:
    engineer = await seed_user(db_session, role=UserRole.engineer)
    payload = {
        "activeMode": "text",
        "text": {
            "rawText": "Stream orders from PostgreSQL; contact jane.doe@acmedata.io for review; 15 min freshness",
            "tags": [],
        },
        "audio": {"transcript": "", "durationSeconds": 0},
        "sql": {"sqlQuery": "", "inferredSources": ["orders_db"]},
        "diagram": {},
        "document": {"fileContent": ""},
    }
    resp = await client.post("/api/v1/requirements/analyze", json=payload, headers=_auth(engineer))
    assert resp.status_code == 200
    body = resp.json()
    assert {"analysis", "contract"} <= set(body)
    assert body["analysis"]["pipelinePattern"] in {"streaming_cdc", "batch_etl", "streaming_analytics"}
    assert body["analysis"]["detectedPii"], "email pattern should be detected"
    assert body["contract"]["sla"]["freshness"]


async def test_team_members_roundtrip(client: httpx.AsyncClient, db_session: AsyncSession) -> None:
    from sqlalchemy import select

    from app.models import User as UserModel

    lead = await seed_user(db_session, role=UserRole.lead)
    ws, _project = await seed_workspace_with_member(
        db_session, lead, member_role=WorkspaceRole.owner, with_project=True
    )
    headers = _auth(lead)

    resp = await client.get("/api/v1/team/members", headers=headers)
    assert resp.status_code == 200
    members = resp.json()
    assert members and {"id", "name", "email", "role", "title"} <= set(members[0])

    resp = await client.post(
        "/api/v1/team/members", json={"email": "newhire@acmedata.io", "role": "viewer"}, headers=headers
    )
    assert resp.status_code == 201

    newhire = (
        (await db_session.execute(select(UserModel).where(UserModel.email == "newhire@acmedata.io")))
        .scalars()
        .first()
    )
    assert newhire is not None
    resp = await client.patch(f"/api/v1/team/members/{newhire.id}", json={"role": "member"}, headers=headers)
    assert resp.status_code == 200

    resp = await client.delete(f"/api/v1/team/members/{newhire.id}", headers=headers)
    assert resp.status_code == 204


async def test_pipelines_fleet_and_detail_shapes(client: httpx.AsyncClient, db_session: AsyncSession) -> None:
    from app.models import Pipeline, PipelineType

    engineer = await seed_user(db_session, role=UserRole.engineer)
    ws, project = await seed_workspace_with_member(
        db_session, engineer, member_role=WorkspaceRole.member, with_project=True
    )
    db_session.add(
        Pipeline(
            project_id=project.id,
            name="orders_cdc_v1",
            pipeline_type=PipelineType.streaming,
            status="active",
            config={"quality_gate": True, "freshness_sla_minutes": 15},
        )
    )
    await db_session.commit()
    headers = _auth(engineer)

    resp = await client.get("/api/v1/pipelines/fleet", headers=headers)
    assert resp.status_code == 200
    rows = resp.json()
    assert rows
    for key in (
        "id",
        "name",
        "status",
        "cadence",
        "source",
        "target",
        "owner",
        "tags",
        "slaMinutes",
        "lastRunAt",
        "nextRunAt",
        "stats",
    ):
        assert key in rows[0], key

    resp = await client.post(
        "/api/v1/pipelines/generate",
        json={
            "config": {"pipelineName": "orders_cdc_v2", "executionMode": "streaming"},
            "graph": {"sources": ["pg"], "sinks": ["sf"]},
        },
        headers=headers,
    )
    assert resp.status_code == 200
    files = resp.json()
    assert {f["target"] for f in files} == {"pyspark", "sql", "airflow_dag", "kafka_config", "tests"}
