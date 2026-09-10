from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class EnvironmentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None
    rank: int = 0
    is_default: bool = False
    config: Optional[dict] = None


class EnvironmentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    rank: Optional[int] = None
    is_default: Optional[bool] = None
    config: Optional[dict] = None


class EnvironmentResponse(BaseModel):
    id: int
    project_id: int
    name: str
    description: Optional[str] = None
    rank: int
    is_default: bool
    config: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
