from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ConnectionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    tool_type: str = Field(min_length=1, max_length=50)
    environment_id: Optional[int] = None
    config: Optional[dict] = None
    # Optional inline secret — stored as a reference, never echoed back
    secret: Optional[str] = None


class ConnectionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    config: Optional[dict] = None
    secret: Optional[str] = None
    status: Optional[str] = None


class ConnectionResponse(BaseModel):
    id: int
    project_id: int
    name: str
    tool_type: str
    environment_id: Optional[int] = None
    config: dict = {}
    secret_ref: Optional[str] = None
    status: str = "disconnected"
    last_health_check: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ConnectionTestResult(BaseModel):
    connection_id: int
    tool_type: str
    status: str
    latency_ms: float = 0
    details: dict = {}
