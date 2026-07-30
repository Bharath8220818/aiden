from sqlalchemy import Column, Integer, String, Float, JSON, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base

class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    event_type = Column(String(100), nullable=False, index=True)  # e.g., "pipeline.run", "pipeline.success", "pipeline.failed"
    pipeline_id = Column(Integer, nullable=True)
    value = Column(Float, nullable=True)  # Numeric metric (e.g., duration_seconds)
    event_metadata = Column("metadata", JSON, default=dict)  # Extra event data (column name kept for DB compat)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
