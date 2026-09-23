"""Incidents + self-healing endpoints — the AIDEN closed loop.

GET  /incidents                  → incident list (frontend `Incident[]`)
POST /incidents/{id}/diagnose    → RCA diagnosis
POST /incidents/{id}/fix         → proposed fix with patches
POST /sandbox/test               → sandbox verification result
POST /healing/{runId}/advance    → advance the 10-stage healing state machine
POST /incidents/{id}/resolve     → resolve + MTTR
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import AuthContext, require_permission
from app.services.incident_healing_service import IncidentHealingService

router = APIRouter(tags=["incidents"])


@router.get("/incidents")
async def list_incidents(
    ctx: AuthContext = Depends(require_permission("incident.read")),
    db: AsyncSession = Depends(get_db),
):
    return await IncidentHealingService(db).list_incidents()


@router.post("/incidents/{incident_id}/diagnose")
async def diagnose_incident(
    incident_id: str,
    ctx: AuthContext = Depends(require_permission("healing.propose")),
    db: AsyncSession = Depends(get_db),
):
    return await IncidentHealingService(db).diagnose(incident_id)


@router.post("/incidents/{incident_id}/fix")
async def generate_fix(
    incident_id: str,
    ctx: AuthContext = Depends(require_permission("healing.propose")),
    db: AsyncSession = Depends(get_db),
):
    return await IncidentHealingService(db).propose_fix(incident_id)


@router.post("/sandbox/test")
async def sandbox_test(
    payload: dict,
    ctx: AuthContext = Depends(require_permission("healing.propose")),
    db: AsyncSession = Depends(get_db),
):
    return await IncidentHealingService(db).sandbox_test(str(payload.get("fixId") or ""))


@router.post("/healing/{run_id}/advance")
async def advance_healing(
    run_id: str,
    payload: dict,
    ctx: AuthContext = Depends(require_permission("healing.execute")),
    db: AsyncSession = Depends(get_db),
):
    return await IncidentHealingService(db).advance(
        run_id,
        str(payload.get("targetStage") or payload.get("target_stage") or ""),
        incident_id=payload.get("incidentId") or payload.get("incident_id"),
        detail=payload.get("detail"),
    )


@router.post("/incidents/{incident_id}/resolve")
async def resolve_incident(
    incident_id: str,
    payload: dict | None = None,
    ctx: AuthContext = Depends(require_permission("incident.update")),
    db: AsyncSession = Depends(get_db),
):
    body = payload or {}
    await IncidentHealingService(db).resolve(incident_id, body.get("mttrMinutes") or body.get("mttr_minutes"))
    return {"status": "ok", "incidentId": incident_id}
