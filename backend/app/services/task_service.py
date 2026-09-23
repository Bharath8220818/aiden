"""Task service — internal team workflow (spec §9).

AIDEN is the source of truth for tasks; Slack/Teams/email only mirror them.
AI agents create tasks through the same service (source="agent") as humans,
and incident-created tasks link back to the incident for closed-loop audits.
"""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models import Task, TaskPriority, TaskStatus, User
from app.services.event_bus import broadcast_platform_event

_STATUS_RANK = {s.value: i for i, s in enumerate(TaskStatus)}


class TaskService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, payload: dict[str, Any], *, created_by: uuid.UUID | None) -> Task:
        workspace_id = payload.get("workspace_id")
        if not workspace_id:
            from app.core.exceptions import ValidationError

            raise ValidationError("workspaceId is required")
        task = Task(
            workspace_id=workspace_id,
            project_id=payload.get("project_id"),
            title=payload["title"],
            description=payload.get("description"),
            status=TaskStatus.todo,
            priority=TaskPriority(payload.get("priority", "medium")),
            assignee_id=payload.get("assignee_id"),
            created_by=created_by,
            source=payload.get("source", "user"),
            related_incident_id=payload.get("related_incident_id"),
            related_pipeline_id=payload.get("related_pipeline_id"),
            due_date=payload.get("due_date"),
        )
        self.db.add(task)
        await self.db.commit()
        await self.db.refresh(task)

        if task.assignee_id:
            await self._notify_assignment(task)
        return task

    async def update(self, task_id: uuid.UUID, payload: dict[str, Any]) -> Task:
        task = await self.db.get(Task, task_id)
        if task is None:
            raise NotFoundError("Task was not found")
        notify = False
        if "status" in payload and payload["status"]:
            new_status = TaskStatus(payload["status"])
            if new_status != task.status:
                task.status = new_status
        if "priority" in payload and payload["priority"]:
            task.priority = TaskPriority(payload["priority"])
        if "assignee_id" in payload and payload["assignee_id"] != task.assignee_id:
            task.assignee_id = payload["assignee_id"]
            notify = payload["assignee_id"] is not None
        for field in ("title", "description", "due_date"):
            if field in payload and payload[field] is not None:
                setattr(task, field, payload[field])
        await self.db.commit()
        await self.db.refresh(task)
        if notify and task.assignee_id:
            await self._notify_assignment(task)
        return task

    async def get(self, task_id: uuid.UUID) -> Task:
        task = await self.db.get(Task, task_id)
        if task is None:
            raise NotFoundError("Task was not found")
        return task

    async def list_for(
        self,
        *,
        workspace_id: uuid.UUID,
        project_id: uuid.UUID | None = None,
        assignee_id: uuid.UUID | None = None,
        status: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Task]:
        stmt = (
            select(Task)
            .where(Task.workspace_id == workspace_id)
            .order_by(Task.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        if project_id is not None:
            stmt = stmt.where(Task.project_id == project_id)
        if assignee_id is not None:
            stmt = stmt.where(Task.assignee_id == assignee_id)
        if status:
            stmt = stmt.where(Task.status == TaskStatus(status))
        return list((await self.db.execute(stmt)).scalars().all())

    async def _notify_assignment(self, task: Task) -> None:
        """Fan out the assignment notification (best-effort)."""
        assignee = await self.db.get(User, task.assignee_id) if task.assignee_id else None
        name = assignee.full_name if assignee else "team member"
        await broadcast_platform_event(
            type="info",
            title="Task assigned",
            message=f"{task.title[:80]} → {name}",
            link="/tasks",
        )
        try:
            from app.services.notification_service import NotificationService

            await NotificationService(self.db).dispatch(
                workspace_id=task.workspace_id,
                title=f"[AIDEN] Task assigned: {task.title[:80]}",
                message=(
                    f"{task.title} (priority: {task.priority.value}) was assigned to {name}."
                ),
                link="/tasks",
                user_ids=[task.assignee_id] if task.assignee_id else None,
                channels=("internal", "slack"),
            )
        except Exception:  # noqa: BLE001 — notification is best-effort
            pass
