"""Task-instance operations — per-task state for the task graph UI."""

from __future__ import annotations

from typing import Any

from app.core.logging import get_logger
from app.integrations.airflow import client

logger = get_logger("aiden.airflow.tasks")


async def list_task_instances(dag_id: str, run_id: str, *, limit: int = 50) -> list[dict[str, Any]]:
    """Task instances of a DAG run, mapped to the Pipeline Manager task shape."""
    try:
        body = await client.request(
            "GET",
            f"/dags/{dag_id}/dagRuns/{run_id}/taskInstances",
            params={"limit": limit},
        )
    except client.AirflowError:
        logger.warning("Task-instance fetch failed for %s/%s", dag_id, run_id, exc_info=True)
        return []
    instances = body.get("task_instances", []) if isinstance(body, dict) else []
    from app.integrations.airflow.mapper import map_task_state

    return [
        {
            "taskId": ti.get("task_id"),
            "state": ti.get("state"),
            "mappedState": map_task_state(ti.get("state")),
            "startDate": ti.get("start_date"),
            "endDate": ti.get("end_date"),
            "durationSec": ti.get("duration"),
            "tryNumber": ti.get("try_number"),
            "host": ti.get("hostname"),
        }
        for ti in instances
    ]
