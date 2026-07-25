from sqlalchemy import Column, DateTime, Enum, Integer, String, Text
from sqlalchemy.sql import func
from app.database import Base
import enum


class AuditSeverity(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


class AuditLog(Base):
    """Append-only audit trail for all user actions.

    Every create / update / delete operation across the system should
    write a row here so team members can review who did what and when.
    """

    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    user_name = Column(String(100), nullable=True)
    action = Column(String(50), nullable=False, index=True)
    resource_type = Column(String(50), nullable=False, index=True)
    resource_id = Column(String(50), nullable=True)
    details = Column(Text, nullable=True)
    severity = Column(Enum(AuditSeverity), default=AuditSeverity.INFO, index=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
