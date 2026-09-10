"""AIDEN Environments API — CRUD for project environments (dev/staging/production)."""
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.database import get_db
from app.models.environment import Environment
from app.models.project import Project
from app.models.user import User
from app.schemas.environment import EnvironmentCreate, EnvironmentUpdate, EnvironmentResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=list[EnvironmentResponse])
async def list_environments(
    project_id: int = Query(..., description="Filter by project"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List environments for a project, ordered by rank."""
    result = await db.execute(
        select(Environment)
        .where(Environment.project_id == project_id)
        .order_by(Environment.rank, Environment.id)
    )
    return result.scalars().all()


@router.post("/", response_model=EnvironmentResponse, status_code=201)
async def create_environment(
    data: EnvironmentCreate,
    project_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = (await db.execute(select(Project).where(Project.id == project_id))).scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    env = Environment(project_id=project_id, **data.model_dump())
    # Ensure only one default environment per project
    if env.is_default:
        others = await db.execute(
            select(Environment).where(Environment.project_id == project_id, Environment.is_default == True)  # noqa: E712
        )
        for other in others.scalars():
            other.is_default = False
    db.add(env)
    await db.commit()
    await db.refresh(env)
    return env


@router.get("/{environment_id}", response_model=EnvironmentResponse)
async def get_environment(
    environment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Environment).where(Environment.id == environment_id))
    env = result.scalar_one_or_none()
    if not env:
        raise HTTPException(status_code=404, detail="Environment not found")
    return env


@router.patch("/{environment_id}", response_model=EnvironmentResponse)
async def update_environment(
    environment_id: int,
    data: EnvironmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Environment).where(Environment.id == environment_id))
    env = result.scalar_one_or_none()
    if not env:
        raise HTTPException(status_code=404, detail="Environment not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(env, field, value)
    await db.commit()
    await db.refresh(env)
    return env


@router.delete("/{environment_id}")
async def delete_environment(
    environment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Environment).where(Environment.id == environment_id))
    env = result.scalar_one_or_none()
    if not env:
        raise HTTPException(status_code=404, detail="Environment not found")
    await db.delete(env)
    await db.commit()
    return {"status": "deleted", "id": environment_id}
