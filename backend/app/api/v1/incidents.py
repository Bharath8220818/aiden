"""AIDEN Incidents API — incident CRUD, resolution workflow, and AI analysis hooks."""
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.database import get_db
from app.models.incident import Incident, IncidentSeverity, IncidentStatus
from app.models.alert import Alert
from app.models.user import User
from app.schemas.incident import IncidentCreate, IncidentUpdate, IncidentResponse, AlertCreate, AlertResponse

logger = logging.getLogger(__name__)

router = APIRouter()


async def _next_incident_key(db: AsyncSession) -> str:
    """Generate the next human-readable incident key (AID-1001, ...)."""
    count = (await db.execute(select(func.count(Incident.id)))).scalar() or 0
    return f"AID-{1001 + count}"


@router.get("/", response_model=list[IncidentResponse])
async def list_incidents(
    project_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    severity: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Incident).order_by(Incident.created_at.desc())
    if project_id:
        query = query.where(Incident.project_id == project_id)
    if status_filter:
        try:
            query = query.where(Incident.status == IncidentStatus(status_filter))
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid status '{status_filter}'")
    if severity:
        try:
            query = query.where(Incident.severity == IncidentSeverity(severity))
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid severity '{severity}'")
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=IncidentResponse, status_code=201)
async def create_incident(
    data: IncidentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create an incident; dedups on fingerprint and notifies via the event bus."""
    # Dedup: same fingerprint + open status = extend existing incident
    if data.fingerprint:
        existing = await db.execute(
            select(Incident).where(
                Incident.fingerprint == data.fingerprint,
                Incident.status.in_([IncidentStatus.OPEN, IncidentStatus.INVESTIGATING, IncidentStatus.IDENTIFIED]),
            )
        )
        dup = existing.scalar_one_or_none()
        if dup:
            return dup

    incident = Incident(
        incident_key=await _next_incident_key(db),
        title=data.title,
        description=data.description,
        severity=IncidentSeverity(data.severity) if data.severity in [s.value for s in IncidentSeverity] else IncidentSeverity.ERROR,
        status=IncidentStatus.OPEN,
        project_id=data.project_id,
        environment_id=data.environment_id,
        pipeline_id=data.pipeline_id,
        fingerprint=data.fingerprint,
        evidence=data.evidence,
        created_by=current_user.id,
    )
    db.add(incident)
    await db.commit()
    await db.refresh(incident)

    # Fan out: event bus → notifications
    try:
        from app.services.event_bus import EventBus
        await EventBus.publish("incident.created", incident.to_dict())
    except Exception as e:
        logger.debug(f"Event publish failed: {e}")

    return incident


@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(
    incident_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.patch("/{incident_id}", response_model=IncidentResponse)
async def update_incident(
    incident_id: int,
    data: IncidentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    update = data.model_dump(exclude_unset=True)
    new_status = update.pop("status", None)
    if new_status:
        try:
            incident.status = IncidentStatus(new_status)
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid status '{new_status}'")
        if incident.status == IncidentStatus.RESOLVED and not incident.resolved_at:
            incident.resolved_at = datetime.now(timezone.utc)
            incident.resolved_by = current_user.id
    for field, value in update.items():
        setattr(incident, field, value)

    await db.commit()
    await db.refresh(incident)

    if incident.status == IncidentStatus.RESOLVED:
        try:
            from app.services.event_bus import EventBus
            await EventBus.publish("incident.resolved", incident.to_dict())
        except Exception as e:
            logger.debug(f"Event publish failed: {e}")

    return incident


@router.post("/{incident_id}/analyze")
async def analyze_incident(
    incident_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run the self-healing agent against this incident and store its diagnosis."""
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    try:
        from app.agents.registry import agent_registry
        agent = agent_registry.get("self_healing")
        if agent is None:
            raise HTTPException(status_code=503, detail="Self-healing agent unavailable")
        analysis = await agent.handle_incident(incident.to_dict(), {"project_id": incident.project_id})

        incident.root_cause = analysis.get("root_cause")
        incident.confidence = int((analysis.get("confidence") or 0) * 100)
        incident.suggested_fix = (analysis.get("proposed_fix") or {}).get("description")
        incident.evidence = analysis.get("evidence", [])
        incident.status = IncidentStatus.IDENTIFIED
        await db.commit()
        await db.refresh(incident)
        return {"analysis": analysis, "incident": incident.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Incident analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")


@router.post("/{incident_id}/resolve", response_model=IncidentResponse)
async def resolve_incident(
    incident_id: int,
    resolution_notes: str = Query("", description="How the incident was resolved"),
    fix_applied: str = Query("", description="Description of the applied fix (learned by RAG)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Resolve an incident and optionally teach the RAG memory the successful fix."""
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    incident.status = IncidentStatus.RESOLVED
    incident.resolved_at = datetime.now(timezone.utc)
    incident.resolved_by = current_user.id
    incident.resolution_notes = resolution_notes
    await db.commit()
    await db.refresh(incident)

    # Learn: store the successful fix in project memory
    if fix_applied:
        try:
            from app.rag.memory_manager import rag_memory
            await rag_memory.store_fix(
                incident.to_dict(),
                {"description": fix_applied, "resolved_by": current_user.id},
            )
        except Exception as e:
            logger.debug(f"Fix learning skipped: {e}")

    try:
        from app.services.event_bus import EventBus
        await EventBus.publish("incident.resolved", incident.to_dict())
    except Exception as e:
        logger.debug(f"Event publish failed: {e}")

    return incident


@router.get("/{incident_id}/alerts", response_model=list[AlertResponse])
async def list_incident_alerts(
    incident_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Alert).where(Alert.incident_id == incident_id).order_by(Alert.created_at.desc())
    )
    return result.scalars().all()


@router.post("/{incident_id}/alerts", response_model=AlertResponse, status_code=201)
async def create_incident_alert(
    incident_id: int,
    data: AlertCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create an alert for an incident and route it through the notification router."""
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    alert = Alert(
        incident_id=incident_id,
        title=data.title,
        message=data.message,
        severity=data.severity,
        channels=data.channels or ["email", "in_app"],
        recipients=data.recipients or [],
        payload=data.payload or {},
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)

    # Route through the notification router
    try:
        from app.services.notification_router import notification_router
        delivery = await notification_router.send({
            "title": data.title,
            "message": data.message or "",
            "severity": data.severity,
            "recipients": data.recipients or [],
            "environment": "production",
            "pipeline_name": "",
        }, data.channels)
        alert.delivery_status = delivery
        await db.commit()
        await db.refresh(alert)
    except Exception as e:
        logger.warning(f"Notification routing failed: {e}")

    return alert
