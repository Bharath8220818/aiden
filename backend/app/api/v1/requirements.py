"""Requirements CRUD endpoints — project-scoped authorization (Phase 2.7)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, Response, status
from pydantic import Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import ensure_project_permission, get_current_user
from app.core.exceptions import ForbiddenError
from app.models.requirement import Requirement, RequirementStatus
from app.models.user import User
from app.repositories.requirement_repository import RequirementRepository
from app.schemas.common import APIModel
from app.schemas.requirement import (
    RequirementCreate,
    RequirementListOut,
    RequirementOut,
    RequirementUpdate,
)
from app.services.requirement_analyzer import analyze as analyze_intent
from app.services.requirement_service import RequirementService

router = APIRouter(prefix="/requirements", tags=["requirements"])


class AnalyzeRequest(APIModel):
    """Frontend `MultimodalInputState` — accepted as a whole payload."""

    activeMode: str = "text"
    text: dict = Field(default_factory=dict)
    audio: dict = Field(default_factory=dict)
    sql: dict = Field(default_factory=dict)
    diagram: dict = Field(default_factory=dict)
    document: dict = Field(default_factory=dict)
    project_id: uuid.UUID | None = Field(default=None, alias="projectId")


@router.post("/analyze")
async def analyze_multimodal_intent(
    payload: AnalyzeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Synthesize `{ analysis, contract }` from the multimodal input.

    When `projectId` is supplied the synthesized contract is also persisted on
    a new requirement record (so the loop Requirement → Contract → Architecture
    leaves a durable trace)."""
    analysis, contract, source = await analyze_intent(
        payload.model_dump(by_alias=False, exclude={"project_id"})
    )
    analysis = {**analysis, "source": source}
    if payload.project_id is not None:
        await ensure_project_permission(db, user, payload.project_id, "project.update")
        from app.schemas.requirement import RequirementCreate

        service = RequirementService(db)
        await service.create(
            RequirementCreate(
                project_id=payload.project_id,
                title=analysis.get("intentTitle", "Synthesized requirement")[:255],
                description=analysis.get("executiveSummary"),
                status="validated",
            ),
            created_by=user.id,
            intent_analysis=analysis,
            data_contract=contract,
        )
    return {"analysis": analysis, "contract": contract}


async def _scoped_requirement(
    db: AsyncSession, user: User, requirement_id: uuid.UUID, action: str
) -> Requirement:
    """Load a requirement through the project/workspace chain and verify `action`."""
    service = RequirementService(db)
    requirement = await service.get(requirement_id)  # 404 if missing
    await ensure_project_permission(db, user, requirement.project_id, action)
    return requirement


@router.post("", response_model=RequirementOut, status_code=status.HTTP_201_CREATED)
async def create_requirement(
    payload: RequirementCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RequirementOut:
    await ensure_project_permission(db, user, payload.project_id, "project.update")
    service = RequirementService(db)
    return await service.to_out(await service.create(payload, created_by=user.id))


@router.get("", response_model=RequirementListOut)
async def list_requirements(
    project_id: uuid.UUID | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RequirementListOut:
    if project_id is not None:
        await ensure_project_permission(db, user, project_id, "project.read")
        requirements = list(
            await RequirementRepository(db).list_by_project(project_id, skip=skip, limit=limit)
        )
    else:
        requirements = list(await RequirementRepository(db).list(skip=skip, limit=limit))
        # Scope to projects the user can actually read.
        readable: list = []
        for requirement in requirements:
            try:
                await ensure_project_permission(db, user, requirement.project_id, "project.read")
                readable.append(requirement)
            except ForbiddenError:
                continue
        requirements = readable
    service = RequirementService(db)
    items = [await service.to_out(r) for r in requirements]
    return RequirementListOut(items=items, total=len(items), skip=skip, limit=limit)


@router.get("/{requirement_id}", response_model=RequirementOut)
async def get_requirement(
    requirement_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RequirementOut:
    requirement = await _scoped_requirement(db, user, requirement_id, "project.read")
    return await RequirementService(db).to_out(requirement)


@router.put("/{requirement_id}", response_model=RequirementOut)
async def update_requirement(
    requirement_id: uuid.UUID,
    payload: RequirementUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RequirementOut:
    requirement = await _scoped_requirement(db, user, requirement_id, "project.update")
    service = RequirementService(db)
    return await service.to_out(await service.update(requirement.id, payload))


@router.delete("/{requirement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_requirement(
    requirement_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    requirement = await _scoped_requirement(db, user, requirement_id, "project.delete")
    await RequirementService(db).delete(requirement.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{requirement_id}/contract", response_model=RequirementOut)
async def save_requirement_contract(
    requirement_id: uuid.UUID,
    payload: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RequirementOut:
    requirement = await _scoped_requirement(db, user, requirement_id, "project.update")
    service = RequirementService(db)
    requirement = await service.save_contract(
        requirement.id,
        intent_analysis=payload.get("intent_analysis"),
        data_contract=payload.get("data_contract"),
        status=RequirementStatus.validated
        if payload.get("intent_analysis") or payload.get("data_contract")
        else None,
    )
    return await service.to_out(requirement)
