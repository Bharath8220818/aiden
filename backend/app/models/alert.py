from sqlalchemy import Column, String, Text, Integer, ForeignKey, JSON, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Alert(Base):
    """A notification record produced when an incident fires or an event triggers a rule."""

    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=True, index=True)
    title = Column(String(500), nullable=False)
    message = Column(Text, nullable=True)
    severity = Column(String(50), default="info", nullable=False, index=True)  # critical | error | warning | info
    # Delivery channels used, e.g. ["email", "slack", "in_app"]
    channels = Column(JSON, default=list, nullable=True)
    # Per-channel delivery status, e.g. {"email": "sent", "slack": "failed"}
    delivery_status = Column(JSON, default=dict, nullable=True)
    recipients = Column(JSON, default=list, nullable=True)
    # Arbitrary event payload that triggered this alert
    payload = Column(JSON, default=dict, nullable=True)
    read = Column(DateTime(timezone=True), nullable=True)  # when acknowledged
    acknowledged_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    incident = relationship("Incident", back_populates="alerts")
    acknowledger = relationship("User", foreign_keys=[acknowledged_by])

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "incident_id": self.incident_id,
            "title": self.title,
            "message": self.message,
            "severity": self.severity,
            "channels": self.channels or [],
            "delivery_status": self.delivery_status or {},
            "recipients": self.recipients or [],
            "payload": self.payload or {},
            "acknowledged": self.read is not None,
            "acknowledged_by": self.acknowledged_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
