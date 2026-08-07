from sqlalchemy import Boolean, Column, String, Integer, DateTime, JSON, Text, Enum
from sqlalchemy.sql import func
from app.database import Base
import enum


class PipelineStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    PAUSED = "paused"


class Pipeline(Base):
    __tablename__ = "pipelines"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(Enum(PipelineStatus, native_enum=False), default=PipelineStatus.DRAFT)
    schedule = Column(String(100), nullable=True)
    config = Column(JSON, default=dict)
    source_type = Column(String(50), nullable=False)
    destination_type = Column(String(50), nullable=False)
    created_by = Column(Integer, nullable=False)
    user_id = Column(Integer, nullable=True, index=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    code = Column(Text, nullable=True)
    dbt_code = Column(Text, nullable=True)
    tests = Column(JSON, default=list)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "status": self.status.value if self.status else None,
            "schedule": self.schedule,
            "source_type": self.source_type,
            "destination_type": self.destination_type,
            "created_by": self.created_by,
            "user_id": self.user_id,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_run_at": self.last_run_at.isoformat() if self.last_run_at else None,
            "code": self.code,
            "dbt_code": self.dbt_code,
            "tests": self.tests,
        }
