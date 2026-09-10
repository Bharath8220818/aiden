from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class WebhookCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    url: str = Field(min_length=1, max_length=2000)
    events: list[str] = Field(default_factory=list)  # e.g. ["pipeline.failed", "incident.created"]
    secret: Optional[str] = None
    is_active: bool = True


class WebhookUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    events: Optional[list[str]] = None
    secret: Optional[str] = None
    is_active: Optional[bool] = None


class WebhookResponse(BaseModel):
    id: int
    name: str
    url: str
    events: list = []
    is_active: bool = True
    last_delivery: Optional[dict] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
