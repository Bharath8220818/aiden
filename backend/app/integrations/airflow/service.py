"""AirflowService — the façade the rest of AIDEN talks to.

Lifecycle implemented on top of the adapter modules:

    deploy   → write DAG bundle into the shared dags/ volume, wait for parse
    trigger  → create a PipelineRun, POST a dagRun, map the state
    sync     → poll run/task state back into AIDEN's PipelineRun rows
    logs     → serve task logs through the platform log-stream contract

Everything degrades honestly: without AIRFLOW_URL the service reports
`mode: "unavailable"` and callers keep working (the orchestrator records the
degraded summary instead of failing the workflow).
"""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.logging import get_logger
from app.integrations.airflow import client, dags, logs, runs, tasks
from app.integrations.airflow.client import AirflowError
from app.integrations.airflow.mapper import map_run_state
from app.models import Pipeline, PipelineRun, RunStatus
from app.services.event_bus import broadcast_pipeline_run

logger = get_logger("aiden.airflow.service")


class AirflowService:
    """Deploy / trigger / sync / logs against a real Airflow deployment."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # -- status ---------------------------------------------------------------
    async def status(self) -> dict[str, Any]:
        reachable = await client.is_reachable()
        return {
            "mode": "live" if reachable else "unavailable",
            "url": client.base_url(),
            "dagFolder": self.dag_folder(),
        }

    # -- deploy ---------------------------------------------------------------
    def dag_folder(self) -> str:
        return get_settings().AIRFLOW_DAGS_FOLDER

    async def deploy(
        self, pipeline: Pipeline, dag_file_content: str, *, wait_for_parse: bool = True
    ) -> dict[str, Any]:
        """Write the generated DAG file into the shared dags folder.

        The Airflow scheduler (docker-compose profile) parses the folder; the
        REST API then reports the DAG as active once parsed.
        """
        dag_id = dags.dag_id_for_pipeline(pipeline.name)
        folder = Path(self.dag_folder())
        folder.mkdir(parents=True, exist_ok=True)
        target = folder / f"{dag_id}.py"
        target.write_text(dag_file_content, encoding="utf-8")
        logger.info("Deployed DAG file %s", target)

        parsed = True
        if wait_for_parse and await client.is_reachable():
            parsed = await dags.wait_until_parsed(dag_id)
        return {"dagId": dag_id, "file": str(target), "parsed": parsed}

    # -- trigger --------------------------------------------------------------
    async def trigger(self, pipeline: Pipeline, pipeline_run: PipelineRun) -> dict[str, Any]:
        """Trigger a dagRun for an existing AIDEN PipelineRun row."""
        dag_id = dags.dag_id_for_pipeline(pipeline.name)
        try:
            result = await runs.trigger(
                dag_id,
                conf={
                    "aiden_pipeline_run_id": str(pipeline_run.id),
                    "aiden_pipeline_id": str(pipeline.id),
                },
            )
        except AirflowError as exc:
            pipeline_run.status = RunStatus.failed
            pipeline_run.error = f"Airflow trigger failed: {exc}"
            pipeline_run.finished_at = datetime.now(UTC)
            await self.db.commit()
            return {
                "status": "failed",
                "dagId": dag_id,
                "error": str(exc),
                "mode": (await self.status())["mode"],
            }

        pipeline_run.status = RunStatus.running
        pipeline_run.started_at = datetime.now(UTC)
        pipeline_run.logs = {"airflowDagId": dag_id, "airflowRunId": result["airflowRunId"]}
        await self.db.commit()

        await broadcast_pipeline_run(pipeline.name, "running", str(pipeline_run.id))
        return {
            "status": "triggered",
            "dagId": dag_id,
            "airflowRunId": result["airflowRunId"],
            "pipelineRunId": str(pipeline_run.id),
            "mode": "live",
        }

    # -- sync -----------------------------------------------------------------
    async def sync(self, pipeline: Pipeline, limit: int = 10) -> list[dict[str, Any]]:
        """Refresh AIDEN PipelineRun rows from Airflow's run state."""
        dag_id = dags.dag_id_for_pipeline(pipeline.name)
        try:
            airflow_runs = await runs.list_runs(dag_id, limit=limit)
        except AirflowError as exc:
            logger.info("Airflow sync unavailable: %s", exc)
            return []

        from sqlalchemy import select

        updated: list[dict[str, Any]] = []
        rows = list(
            (
                await self.db.execute(
                    select(PipelineRun)
                    .where(PipelineRun.pipeline_id == pipeline.id)
                    .order_by(PipelineRun.created_at.desc())
                    .limit(limit)
                )
            )
            .scalars()
            .all()
        )
        by_airflow_id = {
            (r.logs or {}).get("airflowRunId"): r for r in rows if (r.logs or {}).get("airflowRunId")
        }

        for ar in airflow_runs:
            row = by_airflow_id.get(ar["airflowRunId"])
            if row is None:
                continue
            new_status = map_run_state(ar["state"])
            if row.status.value != new_status:
                row.status = RunStatus(new_status)
                if ar.get("endDate") and new_status in {"success", "failed", "canceled"}:
                    row.finished_at = datetime.now(UTC)
                if new_status == "failed" and not row.error:
                    row.error = "Airflow dagRun failed"
                await self.db.commit()
            updated.append(
                {
                    "pipelineRunId": str(row.id),
                    "airflowRunId": ar["airflowRunId"],
                    "status": new_status,
                }
            )
        return updated

    # -- tasks + logs -----------------------------------------------------------
    async def task_instances(self, pipeline: Pipeline, airflow_run_id: str) -> list[dict[str, Any]]:
        dag_id = dags.dag_id_for_pipeline(pipeline.name)
        return await tasks.list_task_instances(dag_id, airflow_run_id)

    async def task_log(
        self, pipeline: Pipeline, airflow_run_id: str, task_id: str, *, try_number: int = 1
    ) -> dict[str, Any]:
        dag_id = dags.dag_id_for_pipeline(pipeline.name)
        return await logs.get_task_log(dag_id, airflow_run_id, task_id, try_number=try_number)

    # -- rerun (healing closed loop) -------------------------------------------
    async def rerun(self, pipeline: Pipeline, pipeline_run: PipelineRun) -> dict[str, Any]:
        """Clear + re-trigger the mapped dagRun — the post-fix 'Apply & rerun'."""
        dag_id = dags.dag_id_for_pipeline(pipeline.name)
        airflow_run_id = (pipeline_run.logs or {}).get("airflowRunId")
        if not airflow_run_id:
            return {"status": "no-mapped-run", "dagId": dag_id}
        try:
            ok = await runs.clear_run(dag_id, airflow_run_id)
        except AirflowError as exc:
            return {"status": "failed", "dagId": dag_id, "error": str(exc)}
        pipeline_run.status = RunStatus.queued
        await self.db.commit()
        return {"status": "rerun-queued" if ok else "rerun-failed", "dagId": dag_id, "airflowRunId": airflow_run_id}


def new_pipeline_run(db: AsyncSession, pipeline: Pipeline, *, trigger_type: str = "manual") -> PipelineRun:
    """Create the AIDEN-side run row that a trigger maps onto."""
    run = PipelineRun(
        pipeline_id=pipeline.id,
        status=RunStatus.queued,
        trigger_type=trigger_type,  # type: ignore[arg-type]
    )
    db.add(run)
    return run
