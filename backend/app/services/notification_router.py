"""AIDEN Notification Router — fans alerts out to delivery channels.

Channels:
  - email   : SMTP via email_service (Brevo / Gmail / Resend)
  - in_app  : WebSocket broadcast to connected dashboards
  - plugins : any notification plugin registered with the PluginManager
              (slack_alert, teams_alert, custom)

The router is transport-agnostic: it receives a plain dict alert and
delegates to whichever channels the alert requests (or all enabled).
"""
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)


class NotificationRouter:
    """Route alerts to their delivery channels."""

    @classmethod
    async def send(cls, alert: dict, channels: Optional[List[str]] = None) -> dict:
        """Send an alert through the requested channels.

        Args:
            alert: dict with title, message, severity, recipients, pipeline_name, etc.
            channels: explicit channel list; None = email + in_app defaults.

        Returns:
            dict of channel -> delivery status
        """
        if channels is None:
            channels = ["email", "in_app"]

        delivery: dict = {}
        for channel in channels:
            try:
                if channel == "email":
                    delivery[channel] = await cls._send_email(alert)
                elif channel == "in_app":
                    delivery[channel] = await cls._send_in_app(alert)
                elif channel == "slack":
                    delivery[channel] = await cls._send_plugin("slack_alert", alert)
                elif channel == "teams":
                    delivery[channel] = await cls._send_plugin("teams_alert", alert)
                else:
                    # try any registered plugin by name
                    delivery[channel] = await cls._send_plugin(channel, alert)
            except Exception as e:
                logger.error(f"Notification channel '{channel}' failed: {e}")
                delivery[channel] = "error"

        return delivery

    # ── Channel implementations ─────────────────────────────────────────

    @staticmethod
    async def _send_email(alert: dict) -> str:
        from app.services.email_service import email_alert_service, AlertEvent

        if not email_alert_service.is_configured:
            logger.info("Email not configured — alert recorded but not sent")
            return "not_configured"

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
        return record.status

    @staticmethod
    async def _send_in_app(alert: dict) -> str:
        from app.api.v1.websocket import broadcast_notification
        await broadcast_notification(
            message=alert.get("title", "AIDEN alert"),
            notif_type=alert.get("severity", "info"),
        )
        return "sent"

    @staticmethod
    async def _send_plugin(plugin_name: str, alert: dict) -> str:
        try:
            from app.plugins.plugin_manager import plugin_manager
            result = await plugin_manager.dispatch_notification(plugin_name, alert)
            return result.get("status", "unknown")
        except ImportError:
            logger.warning(f"Plugin '{plugin_name}' not available")
            return "plugin_missing"


notification_router = NotificationRouter
