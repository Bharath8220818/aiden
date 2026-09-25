"""Platform pulse — aggregate stats from the live database for the landing demo.

One cheap query per source table (COUNT/SUM only), no user data, no secrets.
Design goals: safe to expose unauthenticated (a few coarse numbers + agent
roster names), cached briefly so public hammering can't hurt the DB, and
honest — absent infrastructure reports availability rather than pretending.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent_run import AgentRun
from app.models.incident import Incident, IncidentStatus
from app.models.pipeline_run import PipelineRun, RunStatus
from app.services.orchestrator_service import STAGES

CACHE_TTL = 15.0  # seconds
WINDOW_HOURS = 24

_pulse_cache: dict = {"data": None, "at": 0.0}


def _naive_utc_now() -> datetime:
    """Naive UTC 'now' — matches SQLite server_default (naive UTC) and makes
    the same comparison valid on Postgres with ``timezone=True`` columns."""
    return datetime.now(UTC).replace(tzinfo=None)


async def build_pulse(db: AsyncSession) -> dict:
    """Build the pulse payload from real rows (one cheap query per table)."""
    now = _naive_utc_now()
    cutoff = now - timedelta(hours=WINDOW_HOURS)

    # --- runs (24h window) -------------------------------------------------- #
    runs_status = func.count(PipelineRun.id).label("n")
    runs_q = (
        select(PipelineRun.status, runs_status)
        .where(PipelineRun.created_at >= cutoff)
        .group_by(PipelineRun.status)
        .order_by(runs_status.desc())
        .limit(8)
    )
    run_counts = {status: n for status, n in (await db.execute(runs_q)).all()}
    runs_total = sum(run_counts.values())
    runs_success = run_counts.get(RunStatus.success, 0)
    runs_failed = run_counts.get(RunStatus.failed, 0)
    success_rate = round(runs_success / runs_total * 100, 1) if runs_total else None

    # --- last completed run (proof-of-life for the terminal header) ---------- #
    last_run_q = (
        select(PipelineRun.status, PipelineRun.rows_processed, PipelineRun.duration_ms)
        .where(PipelineRun.status.in_([RunStatus.success, RunStatus.failed]))
        .order_by(PipelineRun.created_at.desc())
        .limit(1)
    )
    last_run = (await db.execute(last_run_q)).first()

    # --- incidents ------------------------------------------------------------ #
    incident_count = func.count(Incident.id).label("n")
    incidents_open = (
        await db.execute(select(incident_count).where(Incident.status != IncidentStatus.resolved))
    ).scalar() or 0
    resolved_q = select(incident_count).where(
        Incident.status == IncidentStatus.resolved,
        Incident.resolved_at >= cutoff,
    )
    incidents_resolved_24h = (await db.execute(resolved_q)).scalar() or 0

    # --- agent runs ------------------------------------------------------------ #
    agent_runs_24h = (
        await db.execute(select(func.count(AgentRun.id)).where(AgentRun.created_at >= cutoff))
    ).scalar() or 0

    return {
        # By construction this payload only exists when the database answered —
        # if the DB is down the endpoint errors and the frontend shows offline.
        "database": "available",
        "generatedAt": now.isoformat(),
        "windowHours": WINDOW_HOURS,
        "runs": {
            "total24h": runs_total,
            "success24h": runs_success,
            "failed24h": runs_failed,
            "successRate": success_rate,
            "last": {
                "status": last_run[0].value if last_run else None,
                "rowsProcessed": last_run[1] if last_run else None,
                "durationMs": last_run[2] if last_run else None,
            },
        },
        "incidents": {
            "open": incidents_open,
            "resolved24h": incidents_resolved_24h,
        },
        "agents": {
            "registered": len(STAGES),
            "agentRuns24h": agent_runs_24h,
        },
    }


async def get_pulse(db: AsyncSession, force: bool = False) -> dict:
    """Cached pulse payload — a 15s TTL keeps public traffic off the DB."""
    import time

    now = time.monotonic()
    if not force and _pulse_cache["data"] is not None and now - _pulse_cache["at"] < CACHE_TTL:
        return _pulse_cache["data"]
    data = await build_pulse(db)
    _pulse_cache["data"] = data
    _pulse_cache["at"] = now
    return data
