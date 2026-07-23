from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class AuditLogResponse(BaseModel):
    id: int
    user_id: int
    user_name: Optional[str]
    action: str
    resource_type: str
    resource_id: Optional[str]
    details: Optional[str]
    severity: str
    ip_address: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogFilter(BaseModel):
    search: Optional[str] = None
    severity: Optional[str] = None
    action: Optional[str] = None
    resource_type: Optional[str] = None
    user_id: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    skip: int = 0
    limit: int = 50


class AuditStats(BaseModel):
    totalEvents: int
    creates: int
    failures: int
    autoActions: int


class AuditListResponse(BaseModel):
    logs: List[AuditLogResponse]
    total: int
    stats: AuditStats


class AuditLogCreate(BaseModel):
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    details: Optional[str] = None
    severity: str = "info"
