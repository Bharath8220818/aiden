import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime
from app.api.v1.websocket import manager

from app.api.v1.deps import get_current_user
from app.database import get_db
from app.models.execution import ExecutionStatus, PipelineExecution
from app.models.pipeline import Pipeline, PipelineStatus
from app.models.user import User
from app.core.intent_parser import IntentParser
from app.core.pipeline_executor import PipelineExecutor
from app.core.rag_memory import rag_memory
from app.schemas.pipeline import (
    PipelineCreate,
    PipelineExecutionResponse,
    PipelineResponse,
    PipelineUpdate,
    PromptRequest,
    RagSearchResponse,
    RagSearchResult,
    TestConnectionRequest,
    TestConnectionResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()
executions_router = APIRouter()
intent_parser = IntentParser()
pipeline_executor = PipelineExecutor()


@router.post("/from-prompt", response_model=PipelineResponse)
async def create_pipeline_from_prompt(
    request: PromptRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a pipeline from a natural language prompt using HF AI agents."""
    prompt = request.prompt
    if not prompt or not prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    # 1. Parse intent using HuggingFace IntentParser (with rule-based fallback)
    parsed_intent = await intent_parser.parse(prompt)

    # 2. Execute through multi-agent system for code generation (lazy import
    #    so the routes module loads even if smolagents isn't installed yet)
    dag_code = None
    dbt_code = None
    tests = parsed_intent.get("data_quality_rules", [])

    try:
        from app.core.agent_orchestrator import AgentOrchestrator, CodeGeneratorTool  # noqa: E402

        orchestrator = AgentOrchestrator()
        if orchestrator.is_enabled():
            agent_result = await orchestrator.execute(prompt, parsed_intent)
            dbt_code = agent_result.get("result") if agent_result.get("status") == "success" else None

        generator = CodeGeneratorTool()
        spec = parsed_intent
        import json

        dag_code = generator.forward(json.dumps(spec), "dag")
        dbt_code = dbt_code or generator.forward(json.dumps(spec), "dbt")
        tests = parsed_intent.get("data_quality_rules", [])
    except Exception as exc:
        logger.warning("Pipeline code generation failed, proceeding with parsed intent only: %s", exc)

    # 3. Save pipeline
    new_pipeline = Pipeline(
        name=parsed_intent.get("name", "Untitled Pipeline"),
        description=prompt[:500],
        config=parsed_intent,
        source_type=parsed_intent.get("source_type", "postgres"),
        destination_type=parsed_intent.get("destination_type", "snowflake"),
        schedule=parsed_intent.get("schedule", "0 6 * * *"),
        created_by=current_user.id,
        user_id=current_user.id,
        status=PipelineStatus.PENDING,
        code=dag_code,
        dbt_code=dbt_code,
        tests=tests,
        is_active=True,
    )

    db.add(new_pipeline)
    await db.commit()
    await db.refresh(new_pipeline)

    # Store in RAG memory for future similarity searches
    if rag_memory.is_ready() and parsed_intent:
        rag_memory.store_pipeline(
            query=prompt,
            parsed=parsed_intent,
            user_id=current_user.id,
            pipeline_id=new_pipeline.id,
        )

    return new_pipeline


@router.get("/rag-search", response_model=RagSearchResponse)
async def search_similar_pipelines(
    query: str = Query(..., min_length=3, description="Natural language query to match against past pipelines"),
    top_k: int = Query(3, ge=1, le=20),
    current_user: User = Depends(get_current_user),
):
    """Search for semantically similar past pipeline intents using RAG."""
    if not rag_memory.is_ready():
        return RagSearchResponse(results=[], total=0)

    similar = rag_memory.search_similar(
        query=query,
        user_id=current_user.id,
        top_k=top_k,
        min_score=0.3,
    )

    results = [
        RagSearchResult(
            query=r["query"],
            parsed=r["parsed"],
            score=round(r["score"], 3),
            pipeline_id=r.get("pipeline_id"),
        )
        for r in similar
    ]

    return RagSearchResponse(results=results, total=len(results))


@router.post("/", response_model=PipelineResponse)
async def create_pipeline(
    request: PipelineCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new pipeline."""
    new_pipeline = Pipeline(
        name=request.name,
        description=request.description,
        source_type=request.source_type,
        destination_type=request.destination_type,
        schedule=request.schedule,
        config=request.config,
        created_by=current_user.id,
        user_id=current_user.id,
        status=PipelineStatus.DRAFT,
        is_active=True,
    )

    db.add(new_pipeline)
    await db.commit()
    await db.refresh(new_pipeline)
    return new_pipeline


@router.get("/", response_model=List[PipelineResponse])
async def list_pipelines(
    skip: int = 0,
    limit: int = 100,
    status: Optional[PipelineStatus] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all pipelines for the current user."""
    query = select(Pipeline).where(
        Pipeline.user_id == current_user.id,
        Pipeline.is_active.is_(True),
    )

    if status:
        query = query.where(Pipeline.status == status)

    if search:
        query = query.where(
            Pipeline.name.ilike(f"%{search}%") | Pipeline.description.ilike(f"%{search}%")
        )

    query = query.order_by(Pipeline.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{pipeline_id}", response_model=PipelineResponse)
async def get_pipeline(
    pipeline_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific pipeline by ID."""
    result = await db.execute(
        select(Pipeline).where(Pipeline.id == pipeline_id, Pipeline.user_id == current_user.id)
    )
    pipeline = result.scalar_one_or_none()

    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    return pipeline


@router.put("/{pipeline_id}", response_model=PipelineResponse)
async def update_pipeline(
    pipeline_id: int,
    request: PipelineUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a pipeline."""
    result = await db.execute(
        select(Pipeline).where(Pipeline.id == pipeline_id, Pipeline.user_id == current_user.id)
    )
    pipeline = result.scalar_one_or_none()

    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(pipeline, key, value)

    await db.commit()
    await db.refresh(pipeline)
    return pipeline


@router.delete("/{pipeline_id}")
async def delete_pipeline(
    pipeline_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft-delete a pipeline."""
    result = await db.execute(
        select(Pipeline).where(Pipeline.id == pipeline_id, Pipeline.user_id == current_user.id)
    )
    pipeline = result.scalar_one_or_none()

    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    pipeline.is_active = False
    pipeline.status = PipelineStatus.PAUSED
    await db.commit()
    return {"status": "deleted", "pipeline_id": pipeline_id}


@router.post("/{pipeline_id}/cancel")
async def cancel_pipeline(
    pipeline_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel a running pipeline execution.

    Finds the active (RUNNING or PENDING) execution for this pipeline
    and signals the executor to stop gracefully.  The executor will
    finish its current stage, set ``ExecutionStatus.CANCELLED``, and
    emit a final ``pipeline_status`` WebSocket event with status
    ``"cancelled"``.
    """
    result = await db.execute(
        select(Pipeline).where(
            Pipeline.id == pipeline_id,
            Pipeline.user_id == current_user.id,
            Pipeline.is_active.is_(True),
        )
    )
    pipeline = result.scalar_one_or_none()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    # Find the running execution
    active_exec = await db.execute(
        select(PipelineExecution).where(
            PipelineExecution.pipeline_id == pipeline_id,
            PipelineExecution.status.in_([
                ExecutionStatus.RUNNING,
                ExecutionStatus.PENDING,
            ]),
        ).order_by(PipelineExecution.started_at.desc()).limit(1)
    )
    execution = active_exec.scalar_one_or_none()
    if not execution:
        raise HTTPException(
            status_code=404,
            detail="No active execution found for this pipeline — it may have already completed.",
        )

    # Signal the executor
    PipelineExecutor.cancel(execution.id)

    # Emit cancellation-requested event immediately so the frontend
    # can update the button state without waiting for the executor
    await manager.broadcast({
        "type": "pipeline_status",
        "pipeline_id": pipeline_id,
        "execution_id": execution.id,
        "status": "cancelling",
        "progress": execution.records_processed or 0,
        "timestamp": datetime.now().isoformat(),
    })

    logger.info("Cancel signal sent for pipeline %d / execution %d", pipeline_id, execution.id)

    return {
        "status": "cancelling",
        "execution_id": execution.id,
        "message": f"Cancellation signal sent for execution #{execution.id}",
    }


@router.post("/{pipeline_id}/run", response_model=PipelineExecutionResponse)
async def run_pipeline(
    pipeline_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Execute a pipeline and run it through the full execution engine."""
    result = await db.execute(
        select(Pipeline).where(
            Pipeline.id == pipeline_id,
            Pipeline.user_id == current_user.id,
            Pipeline.is_active.is_(True),
        )
    )
    pipeline = result.scalar_one_or_none()

    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    # Check for already-running executions
    running_check = await db.execute(
        select(PipelineExecution).where(
            PipelineExecution.pipeline_id == pipeline_id,
            PipelineExecution.status == ExecutionStatus.RUNNING,
        )
    )
    if running_check.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="Pipeline is already running. Wait for completion or cancel the active execution.",
        )

    # Create execution record
    execution = PipelineExecution(
        pipeline_id=pipeline_id,
        user_id=current_user.id,
        status=ExecutionStatus.PENDING,
        triggered_by="manual",
        logs=[],
    )
    db.add(execution)
    pipeline.status = PipelineStatus.PENDING
    db.add(pipeline)
    await db.commit()
    await db.refresh(execution)

    # Emit initial status
    await manager.broadcast({
        "type": "pipeline_status",
        "pipeline_id": pipeline_id,
        "execution_id": execution.id,
        "status": "pending",
        "progress": 0,
        "timestamp": datetime.now().isoformat(),
    })

    # Register cancellation event before launching (closes race window)
    PipelineExecutor._cancel_requests[execution.id] = asyncio.Event()

    # Kick off execution in the background
    # NOTE: Must use asyncio.create_task() — BackgroundTasks.add_task() does NOT support async functions
    task = asyncio.create_task(pipeline_executor.execute(pipeline, execution))

    # Store the task so it doesn't get garbage-collected before completion
    # _active_tasks is initialized in PipelineExecutor.__init__
    pipeline_executor._active_tasks.add(task)
    task.add_done_callback(pipeline_executor._active_tasks.discard)

    return execution


@router.get("/{pipeline_id}/executions", response_model=List[PipelineExecutionResponse])
async def get_pipeline_executions(
    pipeline_id: int,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return execution history for a pipeline."""
    result = await db.execute(
        select(PipelineExecution)
        .where(PipelineExecution.pipeline_id == pipeline_id, PipelineExecution.user_id == current_user.id)
        .order_by(PipelineExecution.started_at.desc())
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/executions/{execution_id}/logs")
async def get_execution_logs(
    execution_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return logs for an execution if available."""
    result = await db.execute(
        select(PipelineExecution).where(
            PipelineExecution.id == execution_id,
            PipelineExecution.user_id == current_user.id,
        )
    )
    execution = result.scalar_one_or_none()
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    return execution.logs or []


@executions_router.get("/")
async def list_executions(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all executions for the current user."""
    result = await db.execute(
        select(PipelineExecution)
        .where(PipelineExecution.user_id == current_user.id)
        .order_by(PipelineExecution.id.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


@executions_router.get("/{execution_id}")
async def get_execution(
    execution_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single execution by ID."""
    result = await db.execute(
        select(PipelineExecution).where(
            PipelineExecution.id == execution_id,
            PipelineExecution.user_id == current_user.id,
        )
    )
    execution = result.scalar_one_or_none()
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    return execution


@executions_router.get("/{execution_id}/logs")
async def get_execution_logs_public(
    execution_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return logs for an execution using the public executions route."""
    return await get_execution_logs(execution_id, db, current_user)


@router.post("/test-connection", response_model=TestConnectionResponse)
async def test_connection(
    request: TestConnectionRequest,
    current_user: User = Depends(get_current_user),
):
    """Test a database connection without saving a pipeline.

    Accepts a connection string (postgresql://, sqlite://, bigquery://),
    attempts to connect using the ``DatabaseConnector``, lists available
    tables, and returns the result.

    Use this endpoint to validate credentials before building a pipeline.
    The connection is always closed (via the async context manager) before
    the response is returned.
    """
    from app.core.db_connector import DatabaseConnector

    try:
        async with DatabaseConnector(request.connection_string) as db:
            try:
                tables = await db.list_tables()
            except Exception as exc:
                logger.warning(
                    "test-connection: connected to %s but list_tables failed: %s",
                    db.db_type, exc,
                )
                tables = []

            return TestConnectionResponse(
                success=True,
                db_type=db.db_type,
                tables=tables,
            )
    except Exception as exc:
        error_msg = str(exc).split("\n")[0][:300]
        logger.info(
            "test-connection failed for %s: %s",
            request.connection_string.split("://")[0] + "://...",
            error_msg,
        )
        return TestConnectionResponse(
            success=False,
            db_type=request.db_type or DatabaseConnector._detect_db_type(request.connection_string),
            error=error_msg,
        )