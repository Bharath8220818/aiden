from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.pipeline import Pipeline, PipelineStatus
from app.core.intent_parser import IntentParser
from app.schemas.pipeline import (
    PromptRequest, PipelineResponse, PipelineCreate, PipelineUpdate
)
from typing import List

router = APIRouter()
intent_parser = IntentParser()

@router.post("/from-prompt", response_model=PipelineResponse)
async def create_pipeline_from_prompt(
    request: PromptRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Create a pipeline from natural language prompt"""
    
    # Parse intent
    parsed_intent = await intent_parser.parse(request.prompt)
    
    # Create pipeline in database
    new_pipeline = Pipeline(
        name=parsed_intent.get("name", "Untitled Pipeline"),
        description=request.prompt[:500],
        config=parsed_intent,
        source_type=parsed_intent.get("source_type", "unknown"),
        destination_type=parsed_intent.get("destination_type", "unknown"),
        schedule=parsed_intent.get("schedule", "0 6 * * *"),
        created_by=1,
        status=PipelineStatus.DRAFT
    )
    
    db.add(new_pipeline)
    await db.commit()
    await db.refresh(new_pipeline)
    
    return new_pipeline

@router.post("/", response_model=PipelineResponse)
async def create_pipeline(
    request: PipelineCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new pipeline"""
    new_pipeline = Pipeline(
        name=request.name,
        description=request.description,
        source_type=request.source_type,
        destination_type=request.destination_type,
        schedule=request.schedule,
        config=request.config,
        created_by=1,
        status=PipelineStatus.DRAFT
    )
    
    db.add(new_pipeline)
    await db.commit()
    await db.refresh(new_pipeline)
    
    return new_pipeline

@router.get("/", response_model=List[PipelineResponse])
async def list_pipelines(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """List all pipelines"""
    result = await db.execute(
        select(Pipeline).offset(skip).limit(limit)
    )
    pipelines = result.scalars().all()
    return pipelines

@router.get("/{pipeline_id}", response_model=PipelineResponse)
async def get_pipeline(
    pipeline_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific pipeline by ID"""
    result = await db.execute(
        select(Pipeline).where(Pipeline.id == pipeline_id)
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
):
    """Update a pipeline"""
    result = await db.execute(
        select(Pipeline).where(Pipeline.id == pipeline_id)
    )
    pipeline = result.scalar_one_or_none()
    
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    if request.name is not None:
        pipeline.name = request.name
    if request.description is not None:
        pipeline.description = request.description
    if request.schedule is not None:
        pipeline.schedule = request.schedule
    if request.config is not None:
        pipeline.config = request.config
    
    await db.commit()
    await db.refresh(pipeline)
    
    return pipeline

@router.delete("/{pipeline_id}")
async def delete_pipeline(
    pipeline_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a pipeline"""
    result = await db.execute(
        select(Pipeline).where(Pipeline.id == pipeline_id)
    )
    pipeline = result.scalar_one_or_none()
    
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    await db.delete(pipeline)
    await db.commit()
    
    return {"status": "deleted"}

@router.post("/{pipeline_id}/run")
async def run_pipeline(
    pipeline_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Run a pipeline"""
    result = await db.execute(
        select(Pipeline).where(Pipeline.id == pipeline_id)
    )
    pipeline = result.scalar_one_or_none()
    
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    pipeline.status = PipelineStatus.RUNNING
    await db.commit()
    
    return {"status": "running", "pipeline_id": pipeline_id}

@router.post("/{pipeline_id}/pause")
async def pause_pipeline(
    pipeline_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Pause a pipeline"""
    result = await db.execute(
        select(Pipeline).where(Pipeline.id == pipeline_id)
    )
    pipeline = result.scalar_one_or_none()
    
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    pipeline.status = PipelineStatus.PAUSED
    await db.commit()
    
    return {"status": "paused", "pipeline_id": pipeline_id}
