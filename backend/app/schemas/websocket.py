from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime

class WSMessage(BaseModel):
    type: str  # "agent_step", "pipeline_status", "execution_update", "notification"
    data: Optional[Any] = None
    timestamp: Optional[str] = None

class PipelineStatusMessage(BaseModel):
    type: str = "pipeline_status"
    pipeline_id: int
    execution_id: int
    stage: str  # "init", "extract", "transform", "load", "finalize"
    status: str  # "running", "success", "failed"
    progress: float = 0.0
    message: Optional[str] = None
    timestamp: Optional[str] = None

class AgentStepMessage(BaseModel):
    type: str = "agent_step"
    agent: str
    status: str  # "running", "success", "failed"
    detail: Optional[str] = None
    timestamp: Optional[str] = None
