from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.sql import func

from app.database import Base
import enum


class ExecutionStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"


class PipelineExecution(Base):
    __tablename__ = "pipeline_executions"

    id = Column(Integer, primary_key=True, index=True)
    pipeline_id = Column(Integer, ForeignKey("pipelines.id"), nullable=False, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    status = Column(Enum(ExecutionStatus), default=ExecutionStatus.PENDING)
    triggered_by = Column(String(50), nullable=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    logs = Column(JSON, default=list)
    records_processed = Column(Integer, nullable=True)
