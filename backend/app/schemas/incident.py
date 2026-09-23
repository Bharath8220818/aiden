"""Incident schemas."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from app.schemas.common import APIModel, ListResponse


class IncidentSeverity(str, enum.Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"


class IncidentStatus(str, enum.Enum):
    detected = "detected"
    investigating = "investigating"
    healing = "healing"
    resolved = "resolved"


class IncidentCreate(APIModel):
    project_id: uuid.UUID | None = None
    pipeline_run_id: uuid.UUID | None = None
    title: str
    severity: IncidentSeverity = IncidentSeverity.medium
    detection_source: str | None = None


class IncidentUpdate(APIModel):
    title: str | None = None
    severity: IncidentSeverity | None = None
    status: IncidentStatus | None = None
    root_cause: dict[str, Any] | None = None
    proposed_fix: dict[str, Any] | None = None
    resolution: str | None = None
    mttr_minutes: int | None = None


class IncidentOut(APIModel):
    id: uuid.UUID
    project_id: uuid.UUID | None = None
    pipeline_run_id: uuid.UUID | None = None
    title: str
    severity: IncidentSeverity
    status: IncidentStatus
    detection_source: str | None = None
    root_cause: dict[str, Any] | None = None
    proposed_fix: dict[str, Any] | None = None
    resolution: str | None = None
    mttr_minutes: int | None = None
    resolved_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class IncidentListOut(ListResponse[IncidentOut]):
    pass
