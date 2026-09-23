"""Pipeline schemas."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from pydantic import Field

from app.schemas.common import APIModel, ListResponse


class PipelineType(str, enum.Enum):
    streaming = "streaming"
    micro_batch = "micro_batch"
    batch = "batch"


class PipelineStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    paused = "paused"
    failed = "failed"
    archived = "archived"


class PipelineCreate(APIModel):
    project_id: uuid.UUID
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    pipeline_type: PipelineType = PipelineType.batch
    config: dict[str, Any] | None = None


class PipelineUpdate(APIModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    pipeline_type: PipelineType | None = None
    config: dict[str, Any] | None = None
    status: PipelineStatus | None = None


class PipelineOut(APIModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    description: str | None = None
    pipeline_type: PipelineType
    config: dict[str, Any] | None = None
    status: PipelineStatus
    created_by: uuid.UUID | None = None
    run_count: int = 0
    created_at: datetime
    updated_at: datetime


class PipelineListOut(ListResponse[PipelineOut]):
    pass
