import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.api.v1.deps import get_current_user
from app.database import get_db
from app.models.execution import ExecutionStatus, PipelineExecution
from app.models.pipeline import Pipeline, PipelineStatus
from app.models.user import User
from app.core.intent_parser import IntentParser
from app.schemas.pipeline import (
    PipelineCreate,
    PipelineExecutionResponse,
    PipelineResponse,
    PipelineUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter()
intent_parser = IntentParser()


@router.post("/from-prompt", response_model=PipelineResponse)
async def create_pipeline_from_prompt(
    prompt: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a pipeline from a natural language prompt using HF AI agents."""
    if not prompt or not prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    # 1. Parse intent using HuggingFace IntentParser (with rule-based fallback)
    parsed_intent = await intent_parser.parse(prompt)

    # 2. Execute through multi-agent system for code generation (lazy import
    #    so the routes module loads even if smolagents isn't installed yet)
    try:
        from app.core.agent_orchestrator import AgentOrchestrator  # noqa: E402
        orchestrator = AgentOrchestrator()
        agent_result = await orchestrator.execute(prompt, parsed_intent)
        agent_code = agent_result.get("result", "")
    except Exception:
        logger.warning("Agent orchestration failed, proceeding with parsed intent only")
        agent_code = None

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
        dbt_code=parsed_intent.get("dbt_code") or str(agent_code) if agent_code else None,
        tests=parsed_intent.get("data_quality_rules", []),
        is_active=True,
    )

    db.add(new_pipeline)
    await db.commit()
    await db.refresh(new_pipeline)
    return new_pipeline


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


@router.post("/{pipeline_id}/run", response_model=PipelineExecutionResponse)
async def run_pipeline(
    pipeline_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a run execution record for the pipeline."""
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

    execution = PipelineExecution(
        pipeline_id=pipeline_id,
        user_id=current_user.id,
        status=ExecutionStatus.PENDING,
        triggered_by="manual",
    )
    db.add(execution)
    await db.commit()
    await db.refresh(execution)
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
