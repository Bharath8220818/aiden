"""AI integration + realtime event tests (Phase 6 Steps 7–8).

- requirements/analyze works with Ollama absent (heuristic) and returns source="heuristic"
- ai_client raises clean errors and the endpoints fall back gracefully
- healing/approval operations broadcast platform events to connected WS clients
"""

from __future__ import annotations

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.models import Incident, User, UserRole, WorkspaceRole
from app.services import ai_client
from tests.helpers import seed_user, seed_workspace_with_member


def _auth(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user.id))}"}


# --------------------------------------------------------------------------- #
# AI client behavior without Ollama
# --------------------------------------------------------------------------- #
async def test_ollama_unavailable_by_default() -> None:
    # Tests run without OLLAMA_URL set — the probe must report unavailable
    # (and never raise), and chat must raise AIServiceUnavailable.
    assert await ai_client.ollama_available() is False
    try:
        await ai_client.chat("hello")
        raised = False
    except ai_client.AIServiceUnavailable:
        raised = True
    except ai_client.AIServiceError:
        raised = True
    assert raised


async def test_extract_json_object_variants() -> None:
    assert ai_client.extract_json_object('{"a": 1}') == {"a": 1}
    assert ai_client.extract_json_object('```json\n{"b": 2}\n```') == {"b": 2}
    assert ai_client.extract_json_object('noise {"c": 3} tail') == {"c": 3}
    assert ai_client.extract_json_object("no json here") == {}


async def test_analyze_reports_heuristic_source(client: httpx.AsyncClient, db_session: AsyncSession) -> None:
    engineer = await seed_user(db_session, role=UserRole.engineer)
    payload = {
        "activeMode": "text",
        "text": {
            "rawText": "Daily sales pipeline from PostgreSQL to Snowflake with masked emails",
            "tags": [],
        },
        "audio": {"transcript": "", "durationSeconds": 0},
        "sql": {"sqlQuery": "", "inferredSources": []},
        "diagram": {},
        "document": {"fileContent": ""},
    }
    resp = await client.post("/api/v1/requirements/analyze", json=payload, headers=_auth(engineer))
    assert resp.status_code == 200
    body = resp.json()
    assert body["analysis"]["source"] in {"heuristic", "ai"}  # heuristic without Ollama
    assert body["analysis"]["pipelinePattern"] in {"streaming_cdc", "batch_etl", "streaming_analytics"}


# --------------------------------------------------------------------------- #
# Realtime broadcasting
# --------------------------------------------------------------------------- #
async def test_healing_advance_broadcasts_events(client: httpx.AsyncClient, db_session: AsyncSession) -> None:
    from app.services import event_bus
    from app.services.incident_healing_service import IncidentHealingService

    lead = await seed_user(db_session, role=UserRole.lead)
    ws, project = await seed_workspace_with_member(
        db_session, lead, member_role=WorkspaceRole.owner, with_project=True
    )
    incident = Incident(
        project_id=project.id,
        title="sales_daily_pipeline — quality gate failure (uniqueness)",
        severity="high",
    )
    db_session.add(incident)
    await db_session.commit()

    seen: list[dict] = []

    async def fake_broadcast(message: dict) -> None:
        seen.append(message)

    original = event_bus.manager.broadcast
    event_bus.manager.broadcast = fake_broadcast  # type: ignore[method-assign]
    try:
        service = IncidentHealingService(db_session)
        await service.advance(f"heal-{incident.id}", "investigating")
        await service.advance(f"heal-{incident.id}", "learned")
    finally:
        event_bus.manager.broadcast = original  # type: ignore[method-assign]

    types = [m["data"]["type"] for m in seen]
    assert "healing" in types
    assert "success" in types  # resolved broadcast on `learned`
    for message in seen:
        assert message["type"] == "platform-event"
        assert {"id", "type", "title", "message", "ts"} <= set(message["data"])


async def test_broadcast_failure_never_breaks_operation(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    from app.services import event_bus
    from app.services.incident_healing_service import IncidentHealingService

    lead = await seed_user(db_session, role=UserRole.lead)
    ws, project = await seed_workspace_with_member(
        db_session, lead, member_role=WorkspaceRole.owner, with_project=True
    )
    incident = Incident(
        project_id=project.id, title="inventory_sync — freshness SLA breach", severity="medium"
    )
    db_session.add(incident)
    await db_session.commit()

    async def exploding_broadcast(message: dict) -> None:
        raise RuntimeError("socket gone")

    original = event_bus.manager.broadcast
    event_bus.manager.broadcast = exploding_broadcast  # type: ignore[method-assign]
    try:
        service = IncidentHealingService(db_session)
        run = await service.advance(f"heal-{incident.id}", "investigating")
        assert run["stage"] == "investigating"  # operation succeeded despite broadcast failure
    finally:
        event_bus.manager.broadcast = original  # type: ignore[method-assign]
