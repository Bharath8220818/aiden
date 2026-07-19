"""
Celery tasks for AIDEN pipeline execution.

Requires a running Redis instance (see docker-compose.yml).
Start the Celery worker with:
    cd backend && venv\\Scripts\\celery.exe -A app.tasks worker --loglevel=info
"""
from celery import Celery
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.execution import ExecutionStatus, PipelineExecution
from app.models.pipeline import Pipeline, PipelineStatus

celery = Celery(
    "aiden",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)
celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)


@celery.task(bind=True, max_retries=3, default_retry_delay=60)
def execute_pipeline(self, pipeline_id: int, execution_id: int) -> dict:
    """
    Execute a pipeline by its ID. This is a synchronous task that runs
    inside the Celery worker. It uses the async DB session in a sync context
    via a helper loop.
    """
    import asyncio

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(_do_execute(pipeline_id, execution_id))
    except Exception as exc:
        loop.run_until_complete(
            _fail_execution(execution_id, str(exc))
        )
        raise self.retry(exc=exc)
    finally:
        loop.close()


async def _do_execute(pipeline_id: int, execution_id: int) -> dict:
    """Internal async pipeline execution logic."""
    async with AsyncSessionLocal() as db:
        # Fetch pipeline
        result = await db.execute(
            select(Pipeline).where(Pipeline.id == pipeline_id)
        )
        pipeline = result.scalar_one_or_none()
        if not pipeline:
            raise ValueError(f"Pipeline {pipeline_id} not found")

        # Mark as running
        pipeline.status = PipelineStatus.RUNNING

        # Mark execution as running
        exec_result = await db.execute(
            select(PipelineExecution).where(PipelineExecution.id == execution_id)
        )
        execution = exec_result.scalar_one_or_none()
        if execution:
            execution.status = ExecutionStatus.RUNNING
            execution.logs = execution.logs or []
            execution.logs.append("Pipeline execution started")

        await db.commit()

        try:
            # ---- PLACEHOLDER: Real execution logic goes here ----
            # Step 1: Connect to source (pipeline.source_type)
            # Step 2: Extract data based on pipeline.config
            # Step 3: Apply transformations
            # Step 4: Load to destination (pipeline.destination_type)
            # Step 5: Run data quality checks

            execution.logs.append(f"Source type: {pipeline.source_type}")
            execution.logs.append(f"Destination type: {pipeline.destination_type}")
            execution.logs.append(f"Config: {pipeline.config}")

            # Simulate work
            execution.logs.append("Extracting data from source...")
            execution.logs.append("Transforming data...")
            execution.logs.append("Loading data to destination...")
            execution.logs.append("Pipeline executed successfully")

            execution.status = ExecutionStatus.SUCCESS
            pipeline.status = PipelineStatus.SUCCESS
            execution.records_processed = 0  # TODO: report real count

        except Exception as exc:
            execution.status = ExecutionStatus.FAILED
            pipeline.status = PipelineStatus.FAILED
            execution.error_message = str(exc)
            execution.logs = execution.logs or []
            execution.logs.append(f"FAILED: {exc}")
            raise

        finally:
            import datetime
            execution.completed_at = datetime.datetime.now(datetime.timezone.utc)
            await db.commit()
            await db.refresh(execution)

    return {
        "execution_id": execution_id,
        "status": execution.status.value,
    }


async def _fail_execution(execution_id: int, error: str) -> None:
    """Mark an execution as failed after all retries are exhausted."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(PipelineExecution).where(PipelineExecution.id == execution_id)
        )
        execution = result.scalar_one_or_none()
        if execution:
            execution.status = ExecutionStatus.FAILED
            execution.error_message = error
            execution.logs = execution.logs or []
            execution.logs.append(f"Final failure: {error}")

            # Also mark the pipeline failed
            pipe_result = await db.execute(
                select(Pipeline).where(Pipeline.id == execution.pipeline_id)
            )
            pipeline = pipe_result.scalar_one_or_none()
            if pipeline:
                pipeline.status = PipelineStatus.FAILED

            await db.commit()
