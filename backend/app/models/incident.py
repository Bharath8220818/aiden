from sqlalchemy import Column, String, Text, Integer, ForeignKey, JSON, DateTime, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class IncidentSeverity(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class IncidentStatus(str, enum.Enum):
    OPEN = "open"
    INVESTIGATING = "investigating"
    IDENTIFIED = "identified"
    RESOLVED = "resolved"
    CLOSED = "closed"


class Incident(Base):
    """A data engineering incident (pipeline failure, quality breach, drift, etc.)."""

    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    # Human-readable incident key, e.g. AID-1042
    incident_key = Column(String(20), unique=True, nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)
    environment_id = Column(Integer, ForeignKey("environments.id"), nullable=True, index=True)
    pipeline_id = Column(Integer, ForeignKey("pipelines.id"), nullable=True, index=True)

    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(Enum(IncidentSeverity, native_enum=False), default=IncidentSeverity.ERROR, nullable=False, index=True)
    status = Column(Enum(IncidentStatus, native_enum=False), default=IncidentStatus.OPEN, nullable=False, index=True)

    # AI diagnosis
    root_cause = Column(Text, nullable=True)
    confidence = Column(Integer, default=0, nullable=False)  # 0-100
    evidence = Column(JSON, default=list, nullable=True)  # structured evidence list
    suggested_fix = Column(Text, nullable=True)
    # Deduplication: fingerprints collapse duplicate incidents
    fingerprint = Column(String(255), nullable=True, index=True)

    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    project = relationship("Project", back_populates="incidents")
    environment = relationship("Environment")
    pipeline = relationship("Pipeline")
    resolver = relationship("User", foreign_keys=[resolved_by])
    alerts = relationship("Alert", back_populates="incident", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "incident_key": self.incident_key,
            "project_id": self.project_id,
            "environment_id": self.environment_id,
            "pipeline_id": self.pipeline_id,
            "title": self.title,
            "description": self.description,
            "severity": self.severity.value if self.severity else None,
            "status": self.status.value if self.status else None,
            "root_cause": self.root_cause,
            "confidence": self.confidence,
            "evidence": self.evidence or [],
            "suggested_fix": self.suggested_fix,
            "fingerprint": self.fingerprint,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "resolution_notes": self.resolution_notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
