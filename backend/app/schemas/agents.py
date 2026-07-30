from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class AgentResponse(BaseModel):
    id: int
    name: str
    status: str
    accuracy: float
    latency: str
    requests: int
    description: Optional[str] = None
    version: Optional[str] = None
    last_trained: Optional[datetime] = None

    class Config:
        from_attributes = True

class AgentMetricsResponse(BaseModel):
    agent_id: int
    response_time: List[float] = []
    success_rate: float = 0.0
    error_rate: float = 0.0
    total_inferences: int = 0
    avg_tokens_used: Optional[int] = None

class TrainingRequest(BaseModel):
    agent_id: int
    epochs: int = 3
    batch_size: int = 4
    learning_rate: float = 2e-4
    dataset_path: str
    use_4bit: bool = True

class TrainingJobResponse(BaseModel):
    id: str
    agent_id: int
    status: str
    progress: float = 0.0
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    loss: Optional[float] = None
    accuracy: Optional[float] = None
    error: Optional[str] = None
