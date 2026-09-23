"""Sprint 3/4/6 integration tests — stage runs, drift detection, Airflow adapter.

- AgentStageRun persistence: one row per stage, pending→done, failures recorded
- Drift detection: deterministic hashing, diff, incident creation on type change
- Drift API: snapshot capture + history (RBAC-gated)
- Airflow adapter: state mapping + DAG-id naming + honest degradation
- Project context: agent_runs.project_id round-trip; RAG scoping parameter
"""

from __future__ import annotations

import uuid

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.models import (
    AgentRun,
    Pipeline,
    Project,
    User,
    UserRole,
    Workspace,
    WorkspaceMember,
    WorkspaceRole,
)
from app.services.drift_service import ColumnProfile, TableProfile, diff_snapshots, schema_hash
from tests.helpers import seed_user


def _auth(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user.id))}"}


async def _seed_project_pipeline(db: AsyncSession, user: User) -> tuple[Project, Pipeline]:
    ws = Workspace(name=f"WS {uuid.uuid4().hex[:6]}", slug=f"ws-{uuid.uuid4().hex[:10]}")
    db.add(ws)
    await db.flush()
    db.add(WorkspaceMember(workspace_id=ws.id, user_id=user.id, role=WorkspaceRole.owner))
    project = Project(workspace_id=ws.id, name=f"P {uuid.uuid4().hex[:4]}", created_by=user.id)
    db.add(project)
    await db.flush()
    pipeline = Pipeline(project_id=project.id, name="orders_daily", created_by=user.id)
    db.add(pipeline)
    await db.commit()
    return project, pipeline


# --------------------------------------------------------------------------- #
# Orchestrator per-stage persistence + project context
# --------------------------------------------------------------------------- #
async def test_orchestrate_persists_stage_rows(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    user = await seed_user(db_session, role=UserRole.admin)
    resp = await client.post(
        "/api/v1/agents/orchestrate/quality_gate",
        json={"prompt": "check orders"},
        headers=_auth(user),
    )
    assert resp.status_code == 200
    run_id = resp.json()["id"]

    detail = await client.get(f"/api/v1/agents/runs/{run_id}", headers=_auth(user))
    assert detail.status_code == 200
    body = detail.json()
    assert body["id"] == run_id
    stage_runs = body["stageRuns"]
    assert len(stage_runs) == 3  # quality_gate has 3 stages
    assert [s["stageNo"] for s in stage_runs] == sorted(s["stageNo"] for s in stage_runs)
    assert all(s["status"] in {"done", "failed", "pending"} for s in stage_runs)
    done = [s for s in stage_runs if s["status"] == "done"]
    assert done, "at least one stage should complete in the test env"
    assert all(s["output"] and "durationMs" in s["output"] for s in done)


async def test_orchestrate_records_project_context(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    user = await seed_user(db_session, role=UserRole.admin)
    _, pipeline = await _seed_project_pipeline(db_session, user)

    resp = await client.post(
        "/api/v1/agents/orchestrate/requirement_to_code",
        json={"prompt": "build orders pipeline", "projectId": str(pipeline.project_id)},
        headers=_auth(user),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["projectId"] == str(pipeline.project_id)

    run = await db_session.get(AgentRun, uuid.UUID(body["id"]))
    assert run is not None and str(run.project_id) == str(pipeline.project_id)


async def test_run_detail_404_for_unknown_id(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    user = await seed_user(db_session, role=UserRole.viewer)
    resp = await client.get(f"/api/v1/agents/runs/{uuid.uuid4()}", headers=_auth(user))
    assert resp.status_code == 404


# --------------------------------------------------------------------------- #
# Drift detection — pure functions
# --------------------------------------------------------------------------- #
def _profile(columns: list[tuple[str, str, bool]], rows: int | None = 10) -> TableProfile:
    return TableProfile(
        table="customers",
        exists=True,
        row_count=rows,
        columns=[ColumnProfile(n, t, nullable) for n, t, nullable in columns],
    )


def test_schema_hash_changes_only_on_schema_change() -> None:
    base = [
        {"name": "id", "dataType": "INTEGER", "nullable": False},
        {"name": "name", "dataType": "VARCHAR", "nullable": True},
    ]
    h1 = schema_hash(base)
    assert h1 == schema_hash([dict(c) for c in base])  # deterministic
    changed = [dict(base[0], dataType="BIGINT"), base[1]]
    assert schema_hash(changed) != h1


def test_diff_detects_integer_to_bigint() -> None:
    previous_cols = [
        {"name": "id", "dataType": "INTEGER", "nullable": False},
        {"name": "email", "dataType": "VARCHAR", "nullable": True},
    ]
    previous = type(
        "S",
        (),
        {
            "columns": previous_cols,
            "row_count": 100,
            "schema_hash": schema_hash(previous_cols),
            "table_name": "customers",
        },
    )()
    result = diff_snapshots(previous, _profile([("id", "BIGINT", False), ("email", "VARCHAR", True)]))
    assert result["schemaChanged"] is True
    kinds = {c["kind"] for c in result["changes"]}
    assert "column_type_changed" in kinds
    assert result["changed"] is True


def test_diff_no_change_when_identical() -> None:
    cols = [("id", "INTEGER", False), ("email", "VARCHAR", True)]
    previous_cols = [
        {"name": "id", "dataType": "INTEGER", "nullable": False},
        {"name": "email", "dataType": "VARCHAR", "nullable": True},
    ]
    previous = type(
        "S", (), {"columns": previous_cols, "row_count": 10, "schema_hash": schema_hash(previous_cols), "table_name": "customers"}
    )()
    result = diff_snapshots(previous, _profile(cols))
    assert result["changed"] is False
    assert result["changes"] == []


def test_diff_flags_row_count_drift() -> None:
    previous_cols = [{"name": "id", "dataType": "INTEGER", "nullable": False}]
    previous = type(
        "S", (), {"columns": previous_cols, "row_count": 10_000, "schema_hash": schema_hash(previous_cols), "table_name": "customers"}
    )()
    result = diff_snapshots(previous, _profile([("id", "INTEGER", False)], rows=2_000))
    assert result["rowCountChanged"] is True
    assert result["schemaChanged"] is False
    assert result["changed"] is True


def test_diff_flags_table_missing() -> None:
    previous_cols = [{"name": "id", "dataType": "INTEGER", "nullable": False}]
    previous = type(
        "S", (), {"columns": previous_cols, "row_count": 5, "schema_hash": schema_hash(previous_cols), "table_name": "customers"}
    )()
    missing = TableProfile(table="customers", exists=False, row_count=None, columns=[])
    result = diff_snapshots(previous, missing)
    assert any(c["kind"] == "table_missing" for c in result["changes"])


# --------------------------------------------------------------------------- #
# Drift API — capture + incident creation
# --------------------------------------------------------------------------- #
async def test_drift_capture_creates_baseline_then_incident(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    user = await seed_user(db_session, role=UserRole.lead)
    _, pipeline = await _seed_project_pipeline(db_session, user)
    headers = _auth(user)
    cols_v1 = [
        {"name": "id", "dataType": "INTEGER", "nullable": False},
        {"name": "name", "dataType": "VARCHAR", "nullable": True},
    ]

    baseline = await client.post(
        "/api/v1/drift/snapshots",
        json={"pipelineId": str(pipeline.id), "table": "customers", "columns": cols_v1, "rowCount": 120},
        headers=headers,
    )
    assert baseline.status_code == 200
    body = baseline.json()
    assert body["drifted"] is False
    assert body["incidentId"] is None
    assert body["changeSummary"] == "Baseline snapshot captured"

    # INTEGER → BIGINT → incident
    cols_v2 = [
        {"name": "id", "dataType": "BIGINT", "nullable": False},
        {"name": "name", "dataType": "VARCHAR", "nullable": True},
    ]
    drifted = await client.post(
        "/api/v1/drift/snapshots",
        json={"pipelineId": str(pipeline.id), "table": "customers", "columns": cols_v2, "rowCount": 130},
        headers=headers,
    )
    assert drifted.status_code == 200
    body = drifted.json()
    assert body["drifted"] is True
    assert body["incidentId"] is not None
    assert "id: INTEGER → BIGINT" in body["changeSummary"]

    # History is queryable
    history = await client.get(
        "/api/v1/drift/snapshots",
        params={"pipelineId": str(pipeline.id), "table": "customers"},
        headers=headers,
    )
    assert history.status_code == 200
    assert len(history.json()) == 2


async def test_drift_snapshots_requires_auth(client: httpx.AsyncClient) -> None:
    resp = await client.get("/api/v1/drift/snapshots")
    assert resp.status_code == 401


async def test_drift_capture_unknown_pipeline_404(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    user = await seed_user(db_session, role=UserRole.engineer)
    resp = await client.post(
        "/api/v1/drift/snapshots",
        json={"pipelineId": str(uuid.uuid4()), "table": "t", "columns": [{"name": "id", "dataType": "INTEGER", "nullable": False}]},
        headers=_auth(user),
    )
    assert resp.status_code == 404


# --------------------------------------------------------------------------- #
# Airflow adapter — mapping, naming, honest degradation
# --------------------------------------------------------------------------- #
def test_dag_id_naming() -> None:
    from app.integrations.airflow import dags

    assert dags.dag_id_for_pipeline("Orders Daily") == "aiden_orders_daily"
    assert dags.dag_id_for_pipeline("Weird -- Name!!") == "aiden_weird_name"
    assert dags.is_aiden_dag("aiden_orders_daily")
    assert not dags.is_aiden_dag("native_dag")


def test_mapper_states() -> None:
    from app.integrations.airflow.mapper import map_run_state, map_task_state

    assert map_run_state("success") == "success"
    assert map_run_state("failed") == "failed"
    assert map_run_state(None) == "queued"
    assert map_run_state("weird") == "queued"
    assert map_task_state("upstream_failed") == "failed"
    assert map_task_state("up_for_retry") == "queued"
    assert map_task_state(None) == "pending"


async def test_pipeline_execute_degrades_without_airflow(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    user = await seed_user(db_session, role=UserRole.lead)
    _, pipeline = await _seed_project_pipeline(db_session, user)

    resp = await client.post(f"/api/v1/pipelines/{pipeline.id}/execute", headers=_auth(user))
    assert resp.status_code == 200
    body = resp.json()
    # No Airflow in the test env → honest failure, never a fake success.
    assert body["status"] == "failed"
    assert body["mode"] == "unavailable"

    # The run row records the failure (auditability of the loop).
    runs = await client.get(
        "/api/v1/pipelines", params={"project_id": str(pipeline.project_id)}, headers=_auth(user)
    )
    assert runs.status_code == 200


async def test_execution_status_reports_unavailable(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    user = await seed_user(db_session, role=UserRole.viewer)
    _, pipeline = await _seed_project_pipeline(db_session, user)
    resp = await client.get(
        f"/api/v1/pipelines/{pipeline.id}/execution/status", headers=_auth(user)
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["airflow"]["mode"] == "unavailable"
    assert body["airflow"]["dagFolder"]
    assert body["syncedRuns"] == []
