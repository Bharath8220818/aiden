"""Tasks endpoints — AIDEN's internal team-workflow system (spec §9).

AIDEN is the source of truth; Slack/Teams/email mirror state. AI agents use
these same endpoints (or TaskService) with source="agent".
"""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import AuthContext, require_permission
from app.models import Task
from app.schemas.task import TaskCreate, TaskUpdate
from app.services.task_service import TaskService

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _out(task) -> dict[str, Any]:
    return {
        "id": str(task.id),
        "workspaceId": str(task.workspace_id),
        "projectId": str(task.project_id) if task.project_id else None,
        "title": task.title,
        "description": task.description,
        "status": task.status.value if hasattr(task.status, "value") else task.status,
        "priority": task.priority.value if hasattr(task.priority, "value") else task.priority,
        "assigneeId": str(task.assignee_id) if task.assignee_id else None,
        "source": task.source,
        "relatedIncidentId": str(task.related_incident_id) if task.related_incident_id else None,
        "relatedPipelineId": str(task.related_pipeline_id) if task.related_pipeline_id else None,
        "dueDate": task.due_date.isoformat() if task.due_date else None,
        "createdAt": task.created_at.isoformat() if task.created_at else None,
    }


@router.post("", status_code=201)
async def create_task(
    payload: TaskCreate,
    ctx: AuthContext = Depends(require_permission("task.create")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    task = await TaskService(db).create(payload.model_dump(by_alias=False), created_by=ctx.user.id)
    return _out(task)


@router.get("")
async def list_tasks(
    workspace_id: uuid.UUID = Query(..., alias="workspaceId"),
    project_id: uuid.UUID | None = Query(None, alias="projectId"),
    assignee_id: uuid.UUID | None = Query(None, alias="assigneeId"),
    status: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    ctx: AuthContext = Depends(require_permission("task.read")),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    tasks = await TaskService(db).list_for(
        workspace_id=workspace_id,
        project_id=project_id,
        assignee_id=assignee_id,
        status=status,
        skip=skip,
        limit=limit,
    )
    return [_out(t) for t in tasks]


@router.get("/{task_id}")
async def get_task(
    task_id: uuid.UUID,
    ctx: AuthContext = Depends(require_permission("task.read")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    return _out(await TaskService(db).get(task_id))


@router.patch("/{task_id}")
async def update_task(
    task_id: uuid.UUID,
    payload: TaskUpdate,
    ctx: AuthContext = Depends(require_permission("task.update")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    return _out(await TaskService(db).update(task_id, payload.model_dump(by_alias=False, exclude_none=True)))


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: uuid.UUID,
    ctx: AuthContext = Depends(require_permission("task.update")),
    db: AsyncSession = Depends(get_db),
):
    from app.core.exceptions import NotFoundError

    task = await db.get(Task, task_id)
    if task is None:
        raise NotFoundError("Task was not found")
    await db.delete(task)
    await db.commit()
    return None
