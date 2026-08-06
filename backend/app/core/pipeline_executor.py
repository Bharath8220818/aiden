import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.pipeline import Pipeline, PipelineStatus
from app.models.execution import PipelineExecution, ExecutionStatus

logger = logging.getLogger(__name__)


def _to_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Normalize naive/aware datetimes into timezone-aware UTC values."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


class PipelineExecutor:
    """Execute pipelines through 5 stages: init → extract → transform → load → finalize."""

    # Class-level cancellation registry — shared across all executor instances
    _cancel_requests: dict = {}

    def __init__(self, db: Optional[AsyncSession] = None):
        self.db = db
        self._active_tasks: set = set()

    async def execute(self, pipeline: Pipeline, execution: PipelineExecution):
        """Run a pipeline execution given pre-fetched Pipeline and Execution records."""
        return await self.run(pipeline.id, execution.id)

    async def run(self, pipeline_id: int, execution_id: int):
        """Run the full pipeline execution lifecycle."""
        if not self.db:
            logger.error(f"PipelineExecutor has no database session")
            return
        execution = await self.db.get(PipelineExecution, execution_id)
        pipeline = await self.db.get(Pipeline, pipeline_id)

        if not execution or not pipeline:
            logger.error(f"Pipeline {pipeline_id} or execution {execution_id} not found")
            return

        try:
            if execution.started_at is None:
                execution.started_at = datetime.now(timezone.utc)
            # Stage 1: Init
            await self._update_status(pipeline, execution, ExecutionStatus.RUNNING, "init")
            logger.info(f"[{execution_id}] Pipeline {pipeline_id}: Initializing...")

            # Stage 2: Extract
            await self._update_stage(execution, "extract")
            await asyncio.sleep(1)  # Simulate extraction
            logger.info(f"[{execution_id}] Extraction complete")

            # Stage 3: Transform
            await self._update_stage(execution, "transform")
            await asyncio.sleep(1)  # Simulate transformation
            logger.info(f"[{execution_id}] Transformation complete")

            # Stage 4: Load
            await self._update_stage(execution, "load")
            await asyncio.sleep(1)  # Simulate loading
            logger.info(f"[{execution_id}] Loading complete")

            # Stage 5: Finalize
            await self._finalize(pipeline, execution)
            logger.info(f"[{execution_id}] Pipeline {pipeline_id} completed successfully")

        except Exception as e:
            logger.error(f"[{execution_id}] Pipeline {pipeline_id} failed: {e}")
            await self._handle_failure(execution, str(e))

    async def _update_status(self, pipeline: Pipeline, execution: PipelineExecution, status: ExecutionStatus, stage: str = ""):
        if not self.db:
            return
        pipeline.status = PipelineStatus.RUNNING if status == ExecutionStatus.RUNNING else PipelineStatus.SUCCESS
        if status == ExecutionStatus.RUNNING:
            pipeline.last_run_at = datetime.now(timezone.utc)
        execution.status = status
        execution.logs = {**execution.logs, stage: {"status": status.value, "timestamp": datetime.now(timezone.utc).isoformat()}} if execution.logs else {stage: {"status": status.value, "timestamp": datetime.now(timezone.utc).isoformat()}}
        await self.db.commit()

    async def _update_stage(self, execution: PipelineExecution, stage: str):
        if not self.db:
            return
        logs = execution.logs or {}
        logs[stage] = {"status": "running", "timestamp": datetime.now(timezone.utc).isoformat()}
        execution.logs = logs
        await self.db.commit()

    async def _finalize(self, pipeline: Pipeline, execution: PipelineExecution):
        if not self.db:
            return
        execution.status = ExecutionStatus.SUCCESS
        execution.completed_at = datetime.now(timezone.utc)
        started_at = _to_utc(execution.started_at) or execution.completed_at
        completed_at = _to_utc(execution.completed_at) or execution.completed_at
        execution.duration_seconds = int((completed_at - started_at).total_seconds())
        execution.records_processed = 1000  # Mock value
        pipeline.status = PipelineStatus.SUCCESS
        pipeline.last_run_at = datetime.now(timezone.utc)
        logs = execution.logs or {}
        logs["finalize"] = {"status": "success", "timestamp": datetime.now(timezone.utc).isoformat()}
        execution.logs = logs
        await self.db.commit()

    async def _handle_failure(self, execution: PipelineExecution, error: str):
        if not self.db:
            return
        execution.status = ExecutionStatus.FAILED
        execution.completed_at = datetime.now(timezone.utc)
        execution.error_message = error
        started_at = _to_utc(execution.started_at) or execution.completed_at
        completed_at = _to_utc(execution.completed_at) or execution.completed_at
        execution.duration_seconds = int((completed_at - started_at).total_seconds())
        await self.db.commit()
