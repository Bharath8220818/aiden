"""Main API router — aggregates all v1 routes under /api/v1."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import (
    agents,
    architecture,
    auth,
    connections,
    drift,
    governance,
    health,
    incidents,
    integrations,
    knowledge,
    monitoring,
    notifications,
    overview,
    pipelines,
    platform,
    project_import,
    projects,
    requirements,
    sql,
    tasks,
    users,
    workspace,
    workspaces,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(overview.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(workspaces.router)
api_router.include_router(projects.router)
api_router.include_router(project_import.router)
api_router.include_router(requirements.router)
api_router.include_router(pipelines.router)
api_router.include_router(platform.router)
api_router.include_router(connections.router)
api_router.include_router(agents.router)
api_router.include_router(knowledge.router)
api_router.include_router(integrations.router)
api_router.include_router(monitoring.router)
api_router.include_router(drift.router)
api_router.include_router(tasks.router)
api_router.include_router(notifications.router)
api_router.include_router(workspace.router)
api_router.include_router(incidents.router)
api_router.include_router(sql.router)
api_router.include_router(architecture.router)
api_router.include_router(governance.router)
