from sqlalchemy import Column, DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func
from app.database import Base
import enum


class AnalyticsEventType(str, enum.Enum):
    PIPELINE_RUN = "pipeline_run"
    PIPELINE_SUCCESS = "pipeline_success"
    PIPELINE_FAILED = "pipeline_failed"
    PIPELINE_CANCELLED = "pipeline_cancelled"
    COST_INCURRED = "cost_incurred"
    DATA_PROCESSED = "data_processed"
    DURATION_RECORDED = "duration_recorded"


class AnalyticsEvent(Base):
    """Time-series analytics events used to compute dashboard KPIs.

    Each row records a single observable event so the ``/analytics/dashboard``
    endpoint can aggregate them into KPIs, trend lines, and cost breakdowns
    without hitting the full pipeline / execution tables on every request.
    """

    __tablename__ = "analytics_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    pipeline_id = Column(Integer, ForeignKey("pipelines.id"), nullable=True, index=True)
    execution_id = Column(Integer, ForeignKey("pipeline_executions.id"), nullable=True)
    event_type = Column(Enum(AnalyticsEventType), nullable=False, index=True)
    value = Column(Float, default=0.0)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
