from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.database import get_db
from app.models.user import User
from app.api.v1.deps import get_current_user
from app.schemas.agents import AgentResponse, AgentMetricsResponse, TrainingRequest, TrainingJobResponse

router = APIRouter()

MOCK_AGENTS = [
    {"id": 1, "name": "Intent Agent", "status": "ready", "accuracy": 94.5, "latency": "1.2s", "requests": 1250, "description": "Parses natural language into structured pipeline plans"},
    {"id": 2, "name": "Extraction Agent", "status": "ready", "accuracy": 92.1, "latency": "2.8s", "requests": 890, "description": "Connects to source databases and discovers schema"},
    {"id": 3, "name": "Analysis Agent", "status": "ready", "accuracy": 88.3, "latency": "3.1s", "requests": 720, "description": "Profiles data quality and detects anomalies"},
    {"id": 4, "name": "Builder Agent", "status": "ready", "accuracy": 76.5, "latency": "4.2s", "requests": 450, "description": "Generates Airflow DAGs, dbt models, and test configurations"},
    {"id": 5, "name": "Self-Healing Agent", "status": "ready", "accuracy": 95.2, "latency": "0.8s", "requests": 340, "description": "Diagnoses failures and proposes fixes with risk assessment"},
]

@router.get("/", response_model=List[AgentResponse])
async def list_agents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all registered AI agents with their status and metrics."""
    return MOCK_AGENTS

@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single agent by ID."""
    for agent in MOCK_AGENTS:
        if agent["id"] == agent_id:
            return agent
    raise HTTPException(status_code=404, detail="Agent not found")

@router.get("/{agent_id}/metrics", response_model=AgentMetricsResponse)
async def get_agent_metrics(
    agent_id: int,
    period: str = Query("7d"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get metrics for a specific agent."""
    return {
        "agent_id": agent_id,
        "response_time": [1.2, 1.5, 1.1, 1.8, 1.3],
        "success_rate": 94.5,
        "error_rate": 2.1,
        "total_inferences": 1250,
        "avg_tokens_used": 256,
    }

@router.post("/train", response_model=TrainingJobResponse)
async def train_agent(
    request: TrainingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Start a training job for an agent."""
    from datetime import datetime
    return {
        "id": f"train_{request.agent_id}_{datetime.utcnow().timestamp():.0f}",
        "agent_id": request.agent_id,
        "status": "queued",
        "progress": 0.0,
        "started_at": datetime.utcnow(),
    }

@router.get("/training/{job_id}", response_model=TrainingJobResponse)
async def get_training_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the status of a training job."""
    return {
        "id": job_id,
        "agent_id": 0,
        "status": "completed",
        "progress": 100.0,
        "loss": 0.023,
        "accuracy": 0.945,
    }
