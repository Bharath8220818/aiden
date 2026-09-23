"""Overview dashboard schemas — mirrors frontend `features/overview/types.ts`.

The frontend consumes this payload verbatim (`api.get('/overview')`), so field
names must match `OverviewDashboardData` exactly: camelCase keys produced via
the alias generator (APIModel serializes by alias).
"""

from __future__ import annotations

import enum

from pydantic import Field

from app.schemas.common import APIModel


class ServiceStatus(str, enum.Enum):
    healthy = "healthy"
    warning = "warning"
    error = "error"
    active = "active"


class PipelineMetricStatusType(str, enum.Enum):
    running = "running"
    successful = "successful"
    failed = "failed"
    queued = "queued"


class InsightType(str, enum.Enum):
    drift = "drift"
    optimization = "optimization"
    lag = "lag"
    security = "security"


class InsightSeverity(str, enum.Enum):
    critical = "critical"
    warning = "warning"
    info = "info"
    success = "success"


class ActivityStatus(str, enum.Enum):
    completed = "completed"
    started = "started"
    warning = "warning"
    auto_healed = "auto_healed"
    schema_updated = "schema_updated"
    failed = "failed"


class CycleStepStatus(str, enum.Enum):
    completed = "completed"
    active = "active"
    queued = "queued"


class SystemHealthServiceOut(APIModel):
    id: str
    name: str
    status: ServiceStatus
    statusLabel: str
    metric: str
    metricLabel: str
    iconName: str
    latency: str | None = None


class PipelineMetricItemOut(APIModel):
    id: str
    label: str
    value: int
    trend: str
    isPositive: bool
    description: str
    statusType: PipelineMetricStatusType
    iconName: str


class AIInsightItemOut(APIModel):
    id: str
    type: InsightType
    severity: InsightSeverity
    title: str
    message: str
    affectedResources: list[str]
    actionLabel: str
    actionRoute: str | None = None
    timestamp: str


class RecentActivityItemOut(APIModel):
    id: str
    time: str
    pipeline: str
    event: str
    status: ActivityStatus
    duration: str | None = None
    recordsProcessed: str | None = None


class EngineeringCycleStepOut(APIModel):
    step: int
    name: str
    description: str
    status: CycleStepStatus
    iconName: str
    autonomousAgent: str


class OverviewDashboardOut(APIModel):
    """Aggregate payload for the Overview dashboard (`GET /api/v1/overview`)."""

    healthServices: list[SystemHealthServiceOut] = Field(default_factory=list)
    pipelineMetrics: list[PipelineMetricItemOut] = Field(default_factory=list)
    insights: list[AIInsightItemOut] = Field(default_factory=list)
    recentActivities: list[RecentActivityItemOut] = Field(default_factory=list)
    engineeringCycle: list[EngineeringCycleStepOut] = Field(default_factory=list)
