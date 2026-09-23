"""PipelineRun schemas."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from app.schemas.common import APIModel, ListResponse


class RunStatus(str, enum.Enum):
    queued = "queued"
    running = "running"
    success = "success"
    failed = "failed"
    canceled = "canceled"


class RunTriggerType(str, enum.Enum):
    schedule = "schedule"
    manual = "manual"
    retry = "retry"
    backfill = "backfill"
    event = "event"


class PipelineRunCreate(APIModel):
    pipeline_id: uuid.UUID
    trigger_type: RunTriggerType = RunTriggerType.manual


class PipelineRunOut(APIModel):
    id: uuid.UUID
    pipeline_id: uuid.UUID
    status: RunStatus
    trigger_type: RunTriggerType
    started_at: datetime | None = None
    finished_at: datetime | None = None
    duration_ms: int | None = None
    rows_processed: int | None = None
    cost: float | None = None
    error: str | None = None
    logs: dict[str, Any] | None = None
    created_at: datetime


class PipelineRunListOut(ListResponse[PipelineRunOut]):
    pass
