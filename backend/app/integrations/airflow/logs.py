"""Log operations — fetch task logs for the Pipeline Manager log stream."""

from __future__ import annotations

from typing import Any

from app.core.logging import get_logger
from app.integrations.airflow import client

logger = get_logger("aiden.airflow.logs")


async def get_task_log(
    dag_id: str, run_id: str, task_id: str, *, try_number: int = 1, max_chars: int = 20_000
) -> dict[str, Any]:
    """Task log content (truncated) for the run detail log stream.

    Airflow serves logs per task try; failures degrade to a structured stub
    so the UI keeps its contract.
    """
    try:
        resp = await client.request(
            "GET",
            f"/dags/{dag_id}/dagRuns/{run_id}/taskInstances/{task_id}/logs/{try_number}",
        )
    except client.AirflowError as exc:
        logger.info("Log fetch unavailable for %s/%s/%s: %s", dag_id, run_id, task_id, exc)
        content = f"[log unavailable] {exc}"
        return {"taskId": task_id, "tryNumber": try_number, "content": content, "truncated": False}

    if isinstance(resp, dict):  # JSON error payloads can come back as dicts
        content = str(resp.get("content", resp))
    else:
        content = str(resp)
    truncated = len(content) > max_chars
    return {
        "taskId": task_id,
        "tryNumber": try_number,
        "content": content[:max_chars],
        "truncated": truncated,
    }
