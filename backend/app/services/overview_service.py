"""Overview service — aggregates the `GET /overview` dashboard payload.

This is a cross-domain aggregate: instead of going through per-entity
repositories, it runs a small set of read-only analytics queries directly and
projects them onto the frontend contract in `frontend/src/features/overview/
types.ts` (`OverviewDashboardData`). Every number shown on the Overview page
comes from real database state (pipeline runs, incidents, approvals, domain
counts) plus live service probes — no fabricated telemetry.

Sections produced:
- healthServices     → live probes (PostgreSQL/Redis/Ollama/Qdrant) + fleet size
- pipelineMetrics    → run-status counts in a 24h window with 24h-over-24h trends
- insights           → open incidents, failing pipelines, paused pipelines,
                       pending approvals (or an all-clear card)
- recentActivities   → latest pipeline runs rendered as activity rows
- engineeringCycle   → the 12-stage closed loop with statuses derived from
                       which stages of the pipeline have real data behind them
"""

from __future__ import annotations

import socket
import time
from datetime import UTC, datetime, timedelta
from urllib.parse import urlparse

import httpx
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import (
    Approval,
    ApprovalStatus,
    Architecture,
    Incident,
    IncidentSeverity,
    IncidentStatus,
    Pipeline,
    PipelineRun,
    PipelineStatus,
    Requirement,
    RunStatus,
)
from app.schemas.overview import (
    ActivityStatus as CardActivityStatus,
)
from app.schemas.overview import (
    AIInsightItemOut,
    EngineeringCycleStepOut,
    InsightSeverity,
    InsightType,
    OverviewDashboardOut,
    PipelineMetricItemOut,
    PipelineMetricStatusType,
    RecentActivityItemOut,
    SystemHealthServiceOut,
)
from app.schemas.overview import (
    CycleStepStatus as CardStepStatus,
)
from app.schemas.overview import (
    ServiceStatus as CardServiceStatus,
)

WINDOW_HOURS = 24
ACTIVITY_LIMIT = 8
INSIGHT_LIMIT = 6

_SEVERITY_RANK = {
    InsightSeverity.critical: 0,
    InsightSeverity.warning: 1,
    InsightSeverity.info: 2,
    InsightSeverity.success: 3,
}

# (name, description, iconName, autonomousAgent) — the fixed 12-stage closed loop.
_ENGINEERING_LOOP = [
    ("UNDERSTAND", "Parse intent & requirements", "Brain", "Requirements Agent"),
    ("PLAN", "Decompose execution stages", "CalendarCheck", "Planner Agent"),
    ("DESIGN", "Synthesize schema & contracts", "Network", "Architect Agent"),
    ("BUILD", "Generate PySpark & Airflow DAGs", "Code", "Builder Agent"),
    ("VALIDATE", "Run contract tests & linters", "ShieldCheck", "QA Agent"),
    ("DEPLOY", "Zero-downtime CI/CD rollout", "Rocket", "Deployer Agent"),
    ("MONITOR", "Stream SLAs & query latencies", "Activity", "Telemetry Agent"),
    ("DETECT", "Spot anomalies & schema drift", "Eye", "Watcher Agent"),
    ("DIAGNOSE", "Root-cause stacktrace analysis", "Search", "Diagnosis Agent"),
    ("REPAIR", "Autonomous patch code diff", "Wrench", "Healer Agent"),
    ("TEST", "Run isolated sandbox replay", "TestTube", "Replay Agent"),
    ("LEARN", "Update RAG knowledge weights", "GraduationCap", "Memory Agent"),
]


# --------------------------------------------------------------------------- #
# Small formatting helpers
# --------------------------------------------------------------------------- #
def _utcnow_naive() -> datetime:
    """Naive UTC 'now' — matches SQLite server_default (naive UTC) and makes
    Python-side comparisons safe for rows returned from either dialect."""
    return datetime.now(UTC).replace(tzinfo=None)


def _as_naive(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    return dt.replace(tzinfo=None) if dt.tzinfo else dt


def _relative_time(dt: datetime | None) -> str:
    if dt is None:
        return "just now"
    seconds = int((_utcnow_naive() - _as_naive(dt)).total_seconds())
    if seconds < 60:
        return "just now"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes} mins ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours} hours ago"
    return f"{hours // 24} days ago"


def _humanize_duration(ms: int | None) -> str | None:
    if ms is None:
        return None
    total_s = int(ms // 1000)
    hours, rem = divmod(total_s, 3600)
    minutes, seconds = divmod(rem, 60)
    if hours:
        return f"{hours}h {minutes}m"
    if minutes:
        return f"{minutes}m {seconds}s"
    return f"{seconds}s"


def _humanize_rows(rows: int | None) -> str | None:
    if rows is None:
        return None
    if rows >= 1_000_000:
        return f"{rows / 1_000_000:.1f}M rows"
    if rows >= 1_000:
        return f"{rows // 1_000}K rows"
    return f"{rows} rows"


def _pct_change(now: int, prev: int) -> str:
    if prev == 0:
        return "+0.0%" if now == 0 else "+100.0%"
    return f"{(now - prev) / prev * 100:+.1f}%"


# --------------------------------------------------------------------------- #
# Service probes
# --------------------------------------------------------------------------- #
async def _tcp_ok(host: str, port: int, timeout: float = 1.0) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


async def _http_ok(url: str, timeout: float = 2.0) -> bool:
    try:
        async with httpx.AsyncClient(timeout=timeout, verify=False) as client:
            resp = await client.get(url)
            return resp.status_code < 500
    except Exception:
        return False


# --------------------------------------------------------------------------- #
# Overview service
# --------------------------------------------------------------------------- #
class OverviewService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.settings = get_settings()

    # -- public entry point --------------------------------------------------
    async def dashboard(self) -> OverviewDashboardOut:
        now = _utcnow_naive()
        cutoff_24h = now - timedelta(hours=WINDOW_HOURS)
        cutoff_48h = now - timedelta(hours=2 * WINDOW_HOURS)

        current_counts = await self._run_status_counts(since=cutoff_24h)
        previous_counts = await self._run_status_counts(since=cutoff_48h, until=cutoff_24h)
        recent_runs = await self._recent_runs()
        open_incidents = await self._open_incidents()
        pending_approvals = await self._pending_approvals()
        active_pipelines, total_pipelines = await self._pipeline_counts()
        paused_pipelines = await self._paused_pipeline_names()
        failed_pipelines = await self._failed_pipeline_counts(cutoff_24h)
        requirement_count = await self._scalar_count(Requirement)
        architecture_count = await self._scalar_count(Architecture)

        return OverviewDashboardOut(
            healthServices=await self._health_services(active_pipelines, total_pipelines),
            pipelineMetrics=self._pipeline_metrics(current_counts, previous_counts),
            insights=self._insights(
                open_incidents=open_incidents,
                pending_approvals=pending_approvals,
                failed_pipelines=failed_pipelines,
                paused_pipelines=paused_pipelines,
            ),
            recentActivities=self._recent_activities(recent_runs, now),
            engineeringCycle=self._engineering_cycle(
                requirement_count=requirement_count,
                architecture_count=architecture_count,
                total_pipelines=total_pipelines,
                success_runs=current_counts.get(RunStatus.success, 0),
                open_incidents=open_incidents,
            ),
        )

    # -- queries --------------------------------------------------------------
    async def _run_status_counts(
        self, *, since: datetime | None = None, until: datetime | None = None
    ) -> dict[RunStatus, int]:
        stmt = select(PipelineRun.status, func.count()).group_by(PipelineRun.status)
        if since is not None:
            stmt = stmt.where(PipelineRun.created_at >= since)
        if until is not None:
            stmt = stmt.where(PipelineRun.created_at < until)
        rows = (await self.db.execute(stmt)).all()
        return {status: count for status, count in rows}

    async def _recent_runs(self) -> list[tuple[PipelineRun, str]]:
        stmt = (
            select(PipelineRun, Pipeline.name)
            .join(Pipeline, PipelineRun.pipeline_id == Pipeline.id)
            .order_by(PipelineRun.created_at.desc())
            .limit(ACTIVITY_LIMIT)
        )
        return list((await self.db.execute(stmt)).all())

    async def _open_incidents(self) -> list[Incident]:
        stmt = (
            select(Incident)
            .where(Incident.status != IncidentStatus.resolved)
            .order_by(Incident.created_at.desc())
            .limit(INSIGHT_LIMIT)
        )
        return list((await self.db.execute(stmt)).scalars().all())

    async def _pending_approvals(self) -> list[Approval]:
        stmt = (
            select(Approval)
            .where(Approval.status == ApprovalStatus.pending)
            .order_by(Approval.created_at.desc())
            .limit(5)
        )
        return list((await self.db.execute(stmt)).scalars().all())

    async def _pipeline_counts(self) -> tuple[int, int]:
        active = (
            await self.db.execute(
                select(func.count()).select_from(Pipeline).where(Pipeline.status == PipelineStatus.active)
            )
        ).scalar_one()
        total = (await self.db.execute(select(func.count()).select_from(Pipeline))).scalar_one()
        return int(active), int(total)

    async def _paused_pipeline_names(self) -> list[str]:
        stmt = (
            select(Pipeline.name)
            .where(Pipeline.status == PipelineStatus.paused)
            .order_by(Pipeline.name)
            .limit(5)
        )
        return list((await self.db.execute(stmt)).scalars().all())

    async def _failed_pipeline_counts(self, since: datetime) -> list[tuple[str, int, str | None]]:
        stmt = (
            select(
                Pipeline.name,
                func.count(),
                func.max(PipelineRun.error),
            )
            .join(Pipeline, PipelineRun.pipeline_id == Pipeline.id)
            .where(PipelineRun.status == RunStatus.failed, PipelineRun.created_at >= since)
            .group_by(Pipeline.name)
            .order_by(func.count().desc())
            .limit(3)
        )
        return list((await self.db.execute(stmt)).all())

    async def _scalar_count(self, model: type) -> int:
        result = await self.db.execute(select(func.count()).select_from(model))
        return int(result.scalar_one())

    # -- section builders -----------------------------------------------------
    async def _health_services(
        self, active_pipelines: int, total_pipelines: int
    ) -> list[SystemHealthServiceOut]:
        cards: list[SystemHealthServiceOut] = []

        # PostgreSQL — mandatory, measured with a round-trip.
        t0 = time.perf_counter()
        db_ok = False
        try:
            await self.db.execute(text("SELECT 1"))
            db_ok = True
        except Exception:
            db_ok = False
        latency_ms = (time.perf_counter() - t0) * 1000
        latency = f"{latency_ms:.0f}ms"
        cards.append(
            SystemHealthServiceOut(
                id="srv-postgres",
                name="PostgreSQL",
                status=CardServiceStatus.healthy if db_ok else CardServiceStatus.error,
                statusLabel="Healthy" if db_ok else "Unreachable",
                metric=latency if db_ok else "—",
                metricLabel="Query Latency" if db_ok else "Connection",
                iconName="Database",
                latency=latency,
            )
        )

        # Redis — optional.
        if self.settings.REDIS_URL:
            parsed = urlparse(self.settings.REDIS_URL)
            ok = await _tcp_ok(parsed.hostname or "localhost", parsed.port or 6379)
            cards.append(
                SystemHealthServiceOut(
                    id="srv-redis",
                    name="Redis",
                    status=CardServiceStatus.healthy if ok else CardServiceStatus.error,
                    statusLabel="Healthy" if ok else "Unreachable",
                    metric="OK" if ok else "—",
                    metricLabel="Connection",
                    iconName="Zap",
                )
            )
        else:
            cards.append(self._not_configured("srv-redis", "Redis", "Zap"))

        # Ollama — optional AI runtime.
        if self.settings.OLLAMA_URL:
            ok = await _http_ok(self.settings.OLLAMA_URL.rstrip("/") + "/api/tags")
            cards.append(
                SystemHealthServiceOut(
                    id="srv-ollama",
                    name="Ollama",
                    status=CardServiceStatus.healthy if ok else CardServiceStatus.error,
                    statusLabel="Healthy" if ok else "Unreachable",
                    metric="Online" if ok else "—",
                    metricLabel="AI Runtime",
                    iconName="Brain",
                )
            )
        else:
            cards.append(self._not_configured("srv-ollama", "Ollama", "Brain"))

        # Qdrant — optional vector store.
        if self.settings.QDRANT_URL:
            ok = await _http_ok(self.settings.QDRANT_URL.rstrip("/") + "/")
            cards.append(
                SystemHealthServiceOut(
                    id="srv-qdrant",
                    name="Qdrant",
                    status=CardServiceStatus.healthy if ok else CardServiceStatus.error,
                    statusLabel="Healthy" if ok else "Unreachable",
                    metric="OK" if ok else "—",
                    metricLabel="Vector Store",
                    iconName="Boxes",
                )
            )
        else:
            cards.append(self._not_configured("srv-qdrant", "Qdrant", "Boxes"))

        # AI agent fleet — represented by managed pipeline coverage for now
        # (replaced by the real agent registry in Phase 10 integration).
        cards.append(
            SystemHealthServiceOut(
                id="srv-ai-agents",
                name="AI Agents",
                status=CardServiceStatus.active,
                statusLabel="Active",
                metric=f"{active_pipelines}/{total_pipelines}",
                metricLabel="Pipelines Online",
                iconName="Bot",
            )
        )
        return cards

    @staticmethod
    def _not_configured(id_: str, name: str, icon: str) -> SystemHealthServiceOut:
        return SystemHealthServiceOut(
            id=id_,
            name=name,
            status=CardServiceStatus.warning,
            statusLabel="Not Configured",
            metric="—",
            metricLabel="Not Configured",
            iconName=icon,
        )

    @staticmethod
    def _pipeline_metrics(
        current: dict[RunStatus, int], previous: dict[RunStatus, int]
    ) -> list[PipelineMetricItemOut]:
        running = current.get(RunStatus.running, 0)
        success_now = current.get(RunStatus.success, 0)
        success_prev = previous.get(RunStatus.success, 0)
        failed_now = current.get(RunStatus.failed, 0)
        failed_prev = previous.get(RunStatus.failed, 0)
        queued = current.get(RunStatus.queued, 0)
        return [
            PipelineMetricItemOut(
                id="metric-running",
                label="Running",
                value=running,
                trend="+0.0%",
                isPositive=True,
                description="Active streaming & batch tasks",
                statusType=PipelineMetricStatusType.running,
                iconName="PlayCircle",
            ),
            PipelineMetricItemOut(
                id="metric-successful",
                label="Successful",
                value=success_now,
                trend=_pct_change(success_now, success_prev),
                isPositive=success_now >= success_prev,
                description="vs previous 24h window",
                statusType=PipelineMetricStatusType.successful,
                iconName="CheckCircle2",
            ),
            PipelineMetricItemOut(
                id="metric-failed",
                label="Failed",
                value=failed_now,
                trend=_pct_change(failed_now, failed_prev),
                isPositive=failed_now <= failed_prev,
                description="vs previous 24h window",
                statusType=PipelineMetricStatusType.failed,
                iconName="XCircle",
            ),
            PipelineMetricItemOut(
                id="metric-queued",
                label="Queued",
                value=queued,
                trend="+0.0%",
                isPositive=True,
                description="Awaiting executor slot",
                statusType=PipelineMetricStatusType.queued,
                iconName="Clock",
            ),
        ]

    def _insights(
        self,
        *,
        open_incidents: list[Incident],
        pending_approvals: list[Approval],
        failed_pipelines: list[tuple[str, int, str | None]],
        paused_pipelines: list[str],
    ) -> list[AIInsightItemOut]:
        insights: list[AIInsightItemOut] = []

        for incident in open_incidents:
            severity_map = {
                IncidentSeverity.critical: InsightSeverity.critical,
                IncidentSeverity.high: InsightSeverity.warning,
                IncidentSeverity.medium: InsightSeverity.warning,
                IncidentSeverity.low: InsightSeverity.info,
            }
            root_cause = incident.root_cause or {}
            if root_cause:
                category = root_cause.get("category", "unknown")
                confidence = root_cause.get("confidence")
                confidence_txt = (
                    f", confidence {confidence:.0%}" if isinstance(confidence, (int, float)) else ""
                )
                message = f"Root cause: {category}{confidence_txt}."
            else:
                message = "Investigation in progress by the Diagnosis Agent."
            insights.append(
                AIInsightItemOut(
                    id=f"ins-incident-{incident.id}",
                    type=InsightType.drift,
                    severity=severity_map[incident.severity],
                    title=incident.title,
                    message=message,
                    affectedResources=[incident.detection_source or "platform"],
                    actionLabel="Investigate",
                    actionRoute="/self-healing",
                    timestamp=_relative_time(incident.created_at),
                )
            )

        for pipeline_name, count, error in failed_pipelines:
            message = f"{count} failed run(s) in the last {WINDOW_HOURS}h."
            if error:
                message += f" Latest: {error[:140]}"
            insights.append(
                AIInsightItemOut(
                    id=f"ins-failed-{pipeline_name}",
                    type=InsightType.drift,
                    severity=InsightSeverity.critical if count >= 3 else InsightSeverity.warning,
                    title=f"{pipeline_name} failing",
                    message=message,
                    affectedResources=[pipeline_name],
                    actionLabel="Diagnose",
                    actionRoute="/self-healing",
                    timestamp="last 24h",
                )
            )

        if paused_pipelines:
            insights.append(
                AIInsightItemOut(
                    id="ins-paused",
                    type=InsightType.optimization,
                    severity=InsightSeverity.info,
                    title="Pipelines paused",
                    message=f"{', '.join(paused_pipelines)} paused — review scheduler slots.",
                    affectedResources=paused_pipelines,
                    actionLabel="Review",
                    actionRoute="/pipelines",
                    timestamp="last 24h",
                )
            )

        if pending_approvals:
            insights.append(
                AIInsightItemOut(
                    id="ins-approvals",
                    type=InsightType.security,
                    severity=InsightSeverity.warning,
                    title="Approval required",
                    message=(f"{len(pending_approvals)} autonomous action(s) awaiting sign-off."),
                    affectedResources=[a.request_type.value for a in pending_approvals],
                    actionLabel="Review",
                    actionRoute="/approvals",
                    timestamp=_relative_time(pending_approvals[0].created_at),
                )
            )

        if not insights:
            insights.append(
                AIInsightItemOut(
                    id="ins-allclear",
                    type=InsightType.optimization,
                    severity=InsightSeverity.success,
                    title="Fleet nominal",
                    message=(
                        f"No open incidents, failed runs or pending approvals in the last {WINDOW_HOURS}h."
                    ),
                    affectedResources=[],
                    actionLabel="Review",
                    actionRoute="/pipelines",
                    timestamp="now",
                )
            )

        insights.sort(key=lambda i: (_SEVERITY_RANK[i.severity], i.id))
        return insights[:INSIGHT_LIMIT]

    @staticmethod
    def _recent_activities(
        recent_runs: list[tuple[PipelineRun, str]], now: datetime
    ) -> list[RecentActivityItemOut]:
        activities: list[RecentActivityItemOut] = []
        for run, pipeline_name in recent_runs:
            started = _as_naive(run.started_at) or _as_naive(run.created_at) or now
            time_str = started.strftime("%H:%M")

            if run.status == RunStatus.success:
                status, event = CardActivityStatus.completed, "Completed"
                duration = _humanize_duration(run.duration_ms)
            elif run.status == RunStatus.running:
                status, event = CardActivityStatus.started, "Started"
                elapsed_min = int(max((now - started).total_seconds(), 0) // 60)
                duration = f"{elapsed_min}m elapsed"
            elif run.status == RunStatus.failed:
                status, event = CardActivityStatus.failed, "Failed"
                duration = _humanize_duration(run.duration_ms)
            else:  # queued / canceled
                status, event = CardActivityStatus.started, "Queued"
                duration = None

            activities.append(
                RecentActivityItemOut(
                    id=str(run.id),
                    time=time_str,
                    pipeline=pipeline_name,
                    event=event,
                    status=status,
                    duration=duration,
                    recordsProcessed=_humanize_rows(run.rows_processed),
                )
            )
        return activities

    @staticmethod
    def _engineering_cycle(
        *,
        requirement_count: int,
        architecture_count: int,
        total_pipelines: int,
        success_runs: int,
        open_incidents: list[Incident],
    ) -> list[EngineeringCycleStepOut]:
        diagnosed = sum(1 for i in open_incidents if i.root_cause)
        repairable = sum(1 for i in open_incidents if i.proposed_fix)

        statuses: list[CardStepStatus] = [
            CardStepStatus.completed if requirement_count > 0 else CardStepStatus.active,  # UNDERSTAND
            CardStepStatus.completed if requirement_count > 0 else CardStepStatus.queued,  # PLAN
            CardStepStatus.completed if architecture_count > 0 else CardStepStatus.queued,  # DESIGN
            CardStepStatus.completed if total_pipelines > 0 else CardStepStatus.queued,  # BUILD
            CardStepStatus.completed if total_pipelines > 0 else CardStepStatus.queued,  # VALIDATE
            CardStepStatus.completed if success_runs > 0 else CardStepStatus.queued,  # DEPLOY
            CardStepStatus.active,  # MONITOR
            CardStepStatus.completed if open_incidents else CardStepStatus.active,  # DETECT
            CardStepStatus.completed if diagnosed else CardStepStatus.queued,  # DIAGNOSE
            CardStepStatus.completed if repairable else CardStepStatus.queued,  # REPAIR
            CardStepStatus.queued,  # TEST
            CardStepStatus.queued,  # LEARN
        ]

        return [
            EngineeringCycleStepOut(
                step=step,
                name=name,
                description=description,
                status=statuses[step - 1],
                iconName=icon,
                autonomousAgent=agent,
            )
            for step, (name, description, icon, agent) in enumerate(_ENGINEERING_LOOP, start=1)
        ]
