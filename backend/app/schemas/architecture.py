"""Architecture schemas."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from pydantic import Field

from app.schemas.common import APIModel, ListResponse


class ArchitectureStatus(str, enum.Enum):
    draft = "draft"
    validating = "validating"
    validated = "validated"
    generated = "generated"


class ArchitectureCreate(APIModel):
    project_id: uuid.UUID
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None


class ArchitectureUpdate(APIModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    blueprint: dict[str, Any] | None = None
    status: ArchitectureStatus | None = None


class ArchitectureOut(APIModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    description: str | None = None
    blueprint: dict[str, Any] | None = None
    status: ArchitectureStatus
    generated_from: str | None = None
    created_by: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime


class ArchitectureListOut(ListResponse[ArchitectureOut]):
    pass
