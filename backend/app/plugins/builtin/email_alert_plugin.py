"""Email notification plugin — bridges the PluginManager to the email service."""
import logging

logger = logging.getLogger(__name__)


class EmailAlertPlugin:
    """Notification plugin that delivers alerts over email via email_service."""

    name = "email_alert"

    async def send_notification(self, alert: dict) -> bool:
        from app.services.email_service import email_alert_service, AlertEvent

        if not email_alert_service.is_configured:
            logger.info("Email plugin: SMTP not configured — skipping delivery")
            return False

        event = AlertEvent(
            severity=alert.get("severity", "info"),
            title=alert.get("title", "AIDEN Alert"),
            message=alert.get("message", ""),
            pipeline_name=alert.get("pipeline_name", ""),
            pipeline_id=int(alert.get("pipeline_id") or 0),
            environment=alert.get("environment", "production"),
            error_details=alert.get("error_details", ""),
            ai_diagnosis=alert.get("ai_diagnosis", ""),
            ai_confidence=float(alert.get("ai_confidence") or 0.0),
            suggested_fix=alert.get("suggested_fix", ""),
        )
        record = email_alert_service.send_alert(event, alert.get("recipients", []))
        return record.status == "sent"


email_plugin = EmailAlertPlugin()
