from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Any

class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[int] = None
    details: Optional[Any] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AuditFilter(BaseModel):
    action: Optional[str] = None
    resource_type: Optional[str] = None
    user_id: Optional[int] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
