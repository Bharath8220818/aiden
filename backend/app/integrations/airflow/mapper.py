"""State mapping — Airflow lifecycle → AIDEN `RunStatus` / task states.

The frontend only knows AIDEN's five run states; Airflow has a richer set
(queued/running/success/failed + None for no-status). This module is the
single translation point so the contract stays narrow.
"""

from __future__ import annotations

from typing import Any

# Airflow dagRun/taskInstance state → AIDEN RunStatus
_AIRFLOW_TO_RUN: dict[str | None, str] = {
    "queued": "queued",
    "running": "running",
    "success": "success",
    "failed": "failed",
    None: "queued",
}

# Task-instance states used by the task graph UI
_AIRFLOW_TO_TASK: dict[str | None, str] = {
    "success": "success",
    "running": "running",
    "failed": "failed",
    "upstream_failed": "failed",
    "queued": "queued",
    "scheduled": "queued",
    "deferred": "queued",
    "up_for_retry": "queued",
    "up_for_reschedule": "queued",
    "none": "pending",
    None: "pending",
    "skipped": "skipped",
    "removed": "skipped",
}


def map_run_state(state: str | None) -> str:
    return _AIRFLOW_TO_RUN.get(state, "queued")


def map_task_state(state: str | None) -> str:
    return _AIRFLOW_TO_TASK.get(state, "pending")


def run_payload_from_airflow(
    run: dict[str, Any], *, pipeline_run_id: str
) -> dict[str, Any]:
    """Build the AIDEN run-update payload from a mapped Airflow run record."""
    return {
        "pipelineRunId": pipeline_run_id,
        "airflowRunId": run.get("airflowRunId"),
        "status": map_run_state(run.get("state")),
        "startedAt": run.get("startDate"),
        "finishedAt": run.get("endDate"),
    }
