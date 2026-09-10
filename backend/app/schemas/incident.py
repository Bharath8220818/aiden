from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class IncidentCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: Optional[str] = None
    severity: str = "error"  # info | warning | error | critical
    project_id: Optional[int] = None
    environment_id: Optional[int] = None
    pipeline_id: Optional[int] = None
    fingerprint: Optional[str] = None
    evidence: Optional[list] = None
    source: Optional[str] = None


class IncidentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None  # open | investigating | identified | resolved | closed
    root_cause: Optional[str] = None
    confidence: Optional[int] = Field(None, ge=0, le=100)
    suggested_fix: Optional[str] = None
    resolution_notes: Optional[str] = None


class IncidentResponse(BaseModel):
    id: int
    incident_key: str
    project_id: Optional[int] = None
    environment_id: Optional[int] = None
    pipeline_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    severity: str
    status: str
    root_cause: Optional[str] = None
    confidence: int = 0
    evidence: Optional[list] = None
    suggested_fix: Optional[str] = None
    fingerprint: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AlertCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    message: Optional[str] = None
    severity: str = "info"
    incident_id: Optional[int] = None
    channels: Optional[List[str]] = None
    recipients: Optional[List[str]] = None
    payload: Optional[dict] = None


class AlertResponse(BaseModel):
    id: int
    incident_id: Optional[int] = None
    title: str
    message: Optional[str] = None
    severity: str
    channels: Optional[list] = None
    delivery_status: Optional[dict] = None
    recipients: Optional[list] = None
    acknowledged: bool = False
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
