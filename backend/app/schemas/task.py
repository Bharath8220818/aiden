"""Task schemas — internal team-workflow contracts (camelCase frontend)."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import Field

from app.schemas.common import APIModel, ListResponse


class TaskCreate(APIModel):
    workspace_id: uuid.UUID = Field(alias="workspaceId")
    project_id: uuid.UUID | None = Field(None, alias="projectId")
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    priority: str = Field("medium", pattern="^(low|medium|high|critical)$")
    assignee_id: uuid.UUID | None = Field(None, alias="assigneeId")
    source: str = Field("user", pattern="^(user|agent|incident)$")
    related_incident_id: uuid.UUID | None = Field(None, alias="relatedIncidentId")
    related_pipeline_id: uuid.UUID | None = Field(None, alias="relatedPipelineId")
    due_date: datetime | None = Field(None, alias="dueDate")


class TaskUpdate(APIModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    status: str | None = Field(None, pattern="^(todo|in_progress|in_review|blocked|done)$")
    priority: str | None = Field(None, pattern="^(low|medium|high|critical)$")
    assignee_id: uuid.UUID | None = Field(None, alias="assigneeId")
    due_date: datetime | None = Field(None, alias="dueDate")


class TaskOut(APIModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    project_id: uuid.UUID | None = None
    title: str
    description: str | None = None
    status: str
    priority: str
    assignee_id: uuid.UUID | None = None
    assignee_name: str | None = None
    source: str
    related_incident_id: uuid.UUID | None = None
    related_pipeline_id: uuid.UUID | None = None
    due_date: datetime | None = None
    created_at: datetime


class TaskListOut(ListResponse[TaskOut]):
    pass
