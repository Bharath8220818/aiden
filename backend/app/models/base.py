from sqlalchemy import Column, Integer, DateTime, Boolean
from sqlalchemy.sql import func
from app.database import Base

class TimestampMixin:
    """Mixin that adds created_at and updated_at columns."""
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class SoftDeleteMixin:
    """Mixin that adds is_active for soft delete support."""
    is_active = Column(Boolean, default=True, nullable=False)

class IDMixin:
    """Mixin that adds an auto-increment primary key id."""
    id = Column(Integer, primary_key=True, index=True)
