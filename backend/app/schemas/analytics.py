from pydantic import BaseModel
from typing import Optional, Any, List

class KPI(BaseModel):
    label: str
    value: Any
    change: Optional[float] = None
    trend: Optional[str] = None  # "up", "down", "stable"

class DashboardResponse(BaseModel):
    total_pipelines: int
    success_rate: float
    failed_pipelines: int
    total_runs: int
    avg_duration: Optional[float] = None
    kpis: List[KPI] = []
    recent_activity: List[Any] = []

class AnalyticsExport(BaseModel):
    format: str = "csv"  # "csv", "json", "pdf"
    date_from: Optional[str] = None
    date_to: Optional[str] = None
