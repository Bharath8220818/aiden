"""Workspace schemas."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from pydantic import Field, field_validator

from app.schemas.common import APIModel


class WorkspaceRole(str, enum.Enum):
    owner = "owner"
    admin = "admin"
    member = "member"
    viewer = "viewer"


def slugify(value: str) -> str:
    import re

    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "workspace"


class WorkspaceCreate(APIModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=500)
    slug: str | None = Field(default=None, max_length=120)

    @field_validator("slug")
    @classmethod
    def _slug(cls, v: str | None) -> str | None:
        return slugify(v) if v else None


class WorkspaceUpdate(APIModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=500)
    slug: str | None = Field(default=None, max_length=120)


class WorkspaceOut(APIModel):
    id: uuid.UUID
    name: str
    slug: str
    description: str | None = None
    member_count: int = 0
    created_at: datetime
    updated_at: datetime


class WorkspaceListOut(APIModel):
    items: list[WorkspaceOut]
    total: int
    skip: int = 0
    limit: int = 100


class WorkspaceMemberOut(APIModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    user_id: uuid.UUID
    user_email: str | None = None
    user_name: str | None = None
    role: WorkspaceRole
    created_at: datetime


class WorkspaceMemberCreate(APIModel):
    user_id: uuid.UUID
    role: WorkspaceRole = WorkspaceRole.member
