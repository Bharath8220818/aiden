"""Run operations — trigger DAG runs and map their lifecycle to AIDEN.

AIDEN's `RunStatus` (queued/running/success/failed/canceled) is the platform
contract; `mapper.py` translates Airflow's richer state set into it.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from app.core.logging import get_logger
from app.integrations.airflow import client, dags

logger = get_logger("aiden.airflow.runs")


async def trigger(dag_id: str, *, logical_date: datetime | None = None, conf: dict | None = None) -> dict[str, Any]:
    """Trigger a DAG run and return its mapped run record."""
    await dags.unpause(dag_id)  # deploying a paused DAG silently no-ops runs
    body: dict[str, Any] = {"conf": conf or {}}
    if logical_date is not None:
        body["logical_date"] = logical_date.isoformat()

    run = await client.request("POST", f"/dags/{dag_id}/dagRuns", json_body=body)
    return {
        "airflowRunId": run.get("dag_run_id"),
        "dagId": dag_id,
        "state": run.get("state", "queued"),
        "triggeredAt": run.get("logical_date") or datetime.now(UTC).isoformat(),
    }


async def get_run(dag_id: str, run_id: str) -> dict[str, Any] | None:
    try:
        run = await client.request("GET", f"/dags/{dag_id}/dagRuns/{run_id}")
    except client.AirflowApiError as exc:
        if exc.status_code == 404:
            return None
        raise
    return {
        "airflowRunId": run.get("dag_run_id"),
        "dagId": dag_id,
        "state": run.get("state"),
        "startDate": run.get("start_date"),
        "endDate": run.get("end_date"),
        "conf": run.get("conf", {}),
    }


async def list_runs(dag_id: str, *, limit: int = 10) -> list[dict[str, Any]]:
    body = await client.request(
        "GET", f"/dags/{dag_id}/dagRuns", params={"limit": limit, "order_by": "-start_date"}
    )
    runs = body.get("dag_runs", []) if isinstance(body, dict) else []
    return [
        {
            "airflowRunId": r.get("dag_run_id"),
            "state": r.get("state"),
            "startDate": r.get("start_date"),
            "endDate": r.get("end_date"),
            "conf": r.get("conf", {}),
        }
        for r in runs
    ]


async def clear_run(dag_id: str, run_id: str) -> bool:
    """Clear (re-execute) a finished DAG run — the 'rerun after fix' path."""
    body = {"dry_run": False, "task_ids": []}
    try:
        await client.request("POST", f"/dags/{dag_id}/dagRuns/{run_id}/clear", json_body=body)
    except client.AirflowApiError:
        logger.warning("Clear failed for %s/%s", dag_id, run_id, exc_info=True)
        return False
    return True


def new_run_id(run_seed: uuid.UUID | None = None) -> str:
    """Airflow-compatible run id (`__`-free, lowercase)."""
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%S")
    seed = (run_seed.hex[:8] if run_seed else uuid.uuid4().hex[:8]).replace("-", "")
    return f"aiden__{stamp}__manual_{seed}".replace("__", "__", 1)
