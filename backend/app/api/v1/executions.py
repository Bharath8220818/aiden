from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from app.database import get_db
from app.models.execution import PipelineExecution, ExecutionStatus
from app.models.user import User
from app.api.v1.deps import get_current_user
from app.schemas.execution import ExecutionResponse

router = APIRouter()

@router.get("/", response_model=List[ExecutionResponse])
async def list_executions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    pipeline_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all executions for the current user."""
    query = select(PipelineExecution).where(PipelineExecution.user_id == current_user.id)
    if pipeline_id:
        query = query.where(PipelineExecution.pipeline_id == pipeline_id)
    query = query.order_by(PipelineExecution.started_at.desc()).offset(skip).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{execution_id}", response_model=ExecutionResponse)
async def get_execution(
    execution_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single execution by ID."""
    execution = await db.get(PipelineExecution, execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    if execution.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized")
    return execution

@router.get("/{execution_id}/logs")
async def get_execution_logs(
    execution_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get execution logs."""
    execution = await db.get(PipelineExecution, execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    if execution.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized")
    return {"execution_id": execution_id, "logs": execution.logs}

@router.post("/{execution_id}/cancel")
async def cancel_execution(
    execution_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel a running execution."""
    execution = await db.get(PipelineExecution, execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    if execution.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not authorized")
    if execution.status != ExecutionStatus.RUNNING:
        raise HTTPException(status_code=400, detail="Execution is not running")

    execution.status = ExecutionStatus.FAILED
    await db.commit()
    return {"message": "Execution cancelled successfully"}
