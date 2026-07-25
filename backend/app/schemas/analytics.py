from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class AnalyticsKPI(BaseModel):
    totalRuns: int
    totalPipelines: int
    totalCost: float
    dataProcessed: str
    avgSuccessRate: float
    trend: dict  # {runs: float, cost: float, successRate: float, dataVolume: float}


class PerformancePoint(BaseModel):
    date: str
    runs: int
    success: int
    failed: int
    avgDuration: float


class CostCategory(BaseModel):
    category: str
    amount: float
    percentage: float
    trend: str  # 'up' | 'down'
    trendValue: str


class PipelinePerformance(BaseModel):
    id: int
    name: str
    runs: int
    avgDuration: float
    dataVolume: str
    cost: str
    successRate: float


class DashboardResponse(BaseModel):
    kpis: AnalyticsKPI
    performance: List[PerformancePoint]
    costs: List[CostCategory]
    pipelines: List[PipelinePerformance]


class AnalyticsEventCreate(BaseModel):
    pipeline_id: int
    event_type: str
    value: float = 0.0
    metadata_json: Optional[str] = None


class AnalyticsEventResponse(BaseModel):
    id: int
    user_id: int
    pipeline_id: Optional[int]
    event_type: str
    value: float
    metadata_json: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
