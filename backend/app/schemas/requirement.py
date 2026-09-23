"""Requirement schemas."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from pydantic import Field

from app.schemas.common import APIModel, ListResponse


class RequirementStatus(str, enum.Enum):
    draft = "draft"
    analyzing = "analyzing"
    validated = "validated"
    rejected = "rejected"
    approved = "approved"


class RequirementCreate(APIModel):
    project_id: uuid.UUID
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None


class RequirementUpdate(APIModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    intent_analysis: dict[str, Any] | None = None
    data_contract: dict[str, Any] | None = None
    status: RequirementStatus | None = None


class RequirementOut(APIModel):
    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    description: str | None = None
    intent_analysis: dict[str, Any] | None = None
    data_contract: dict[str, Any] | None = None
    status: RequirementStatus
    created_by: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime


class RequirementListOut(ListResponse[RequirementOut]):
    pass
