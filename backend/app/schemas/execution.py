from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Any

class ExecutionBase(BaseModel):
    pipeline_id: int
    triggered_by: str = "manual"

class ExecutionCreate(ExecutionBase):
    pass

class ExecutionResponse(ExecutionBase):
    id: int
    user_id: int
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    error_message: Optional[str] = None
    logs: Optional[Any] = None
    records_processed: Optional[int] = 0

    class Config:
        from_attributes = True

class ExecutionLogs(BaseModel):
    execution_id: int
    logs: str
    has_more: bool = False
