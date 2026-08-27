"""
AIDEN Email Alerts API
Endpoints for managing and sending email alerts.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.email_service import email_alert_service, AlertEvent

router = APIRouter(prefix="/api/v1/alerts", tags=["alerts"])


class SendAlertRequest(BaseModel):
    severity: str = "error"
    title: str
    message: str
    pipeline_name: str = ""
    pipeline_id: int = 0
    environment: str = "production"
    error_details: str = ""
    ai_diagnosis: str = ""
    ai_confidence: float = 0.0
    suggested_fix: str = ""
    recipients: list[str] = []


class PipelineFailureAlertRequest(BaseModel):
    pipeline_name: str
    pipeline_id: int
    error: str
    environment: str = "production"
    recipients: list[str] = []
    ai_diagnosis: str = ""
    ai_confidence: float = 0.0
    suggested_fix: str = ""


@router.get("/stats")
async def get_alert_stats():
    """Get alert statistics."""
    return email_alert_service.get_stats()


@router.get("/history")
async def get_alert_history(limit: int = 50):
    """Get recent alert history."""
    return email_alert_service.get_alert_history(limit)


@router.post("/send")
async def send_alert(req: SendAlertRequest):
    """Send a custom alert email."""
    event = AlertEvent(
        severity=req.severity,
        title=req.title,
        message=req.message,
        pipeline_name=req.pipeline_name,
        pipeline_id=req.pipeline_id,
        environment=req.environment,
        error_details=req.error_details,
        ai_diagnosis=req.ai_diagnosis,
        ai_confidence=req.ai_confidence,
        suggested_fix=req.suggested_fix,
    )
    record = email_alert_service.send_alert(event, req.recipients)
    return {
        "status": record.status,
        "alert_id": record.id,
        "sent_at": record.sent_at.isoformat(),
    }


@router.post("/pipeline-failure")
async def send_pipeline_failure_alert(req: PipelineFailureAlertRequest):
    """Send a pipeline failure alert with AI enrichment."""
    record = email_alert_service.send_pipeline_failure_alert(
        pipeline_name=req.pipeline_name,
        pipeline_id=req.pipeline_id,
        error=req.error,
        environment=req.environment,
        recipients=req.recipients,
        ai_diagnosis=req.ai_diagnosis,
        ai_confidence=req.ai_confidence,
        suggested_fix=req.suggested_fix,
    )
    return {
        "status": record.status,
        "alert_id": record.id,
        "sent_at": record.sent_at.isoformat(),
    }


@router.post("/test")
async def test_email_alert(recipients: list[str]):
    """Send a test alert email to verify configuration."""
    if not recipients:
        raise HTTPException(status_code=400, detail="At least one recipient email required")
    
    event = AlertEvent(
        severity="info",
        title="AIDEN Alert System Test",
        message="This is a test alert from AIDEN. If you received this, the email alert system is working correctly.",
        pipeline_name="test-pipeline",
        environment="test",
    )
    record = email_alert_service.send_alert(event, recipients)
    return {
        "status": record.status,
        "alert_id": record.id,
        "configured": email_alert_service.is_configured,
        "provider": email_alert_service.config.smtp_provider,
    }
