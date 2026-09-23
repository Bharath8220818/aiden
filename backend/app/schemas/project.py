"""Project schemas."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from pydantic import Field

from app.schemas.common import APIModel, ListResponse


class ProjectStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    archived = "archived"


class ProjectCreate(APIModel):
    workspace_id: uuid.UUID
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)


class ProjectUpdate(APIModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    status: ProjectStatus | None = None


class ProjectOut(APIModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    description: str | None = None
    status: ProjectStatus
    created_by: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime

    # relationship counts (populated by the service layer)
    requirement_count: int = 0
    architecture_count: int = 0
    pipeline_count: int = 0
    incident_count: int = 0


class ProjectListOut(ListResponse[ProjectOut]):
    pass
