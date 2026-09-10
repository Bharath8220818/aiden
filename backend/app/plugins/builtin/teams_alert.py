"""Microsoft Teams notification plugin — posts alerts to a Teams incoming webhook.

Configure via environment variables:
    TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/...
    TEAMS_ALERTS_ENABLED=true
"""
import logging
import os

logger = logging.getLogger(__name__)

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    httpx = None
    HTTPX_AVAILABLE = False


class TeamsAlertPlugin:
    """Notification plugin that posts alerts to a Microsoft Teams webhook."""

    name = "teams_alert"

    @property
    def webhook_url(self) -> str:
        return os.getenv("TEAMS_WEBHOOK_URL", "")

    @property
    def enabled(self) -> bool:
        return os.getenv("TEAMS_ALERTS_ENABLED", "false").lower() == "true" and bool(self.webhook_url)

    async def send_notification(self, alert: dict) -> bool:
        if not self.enabled:
            logger.info("Teams plugin: disabled or TEAMS_WEBHOOK_URL not set — skipping")
            return False
        if not HTTPX_AVAILABLE:
            logger.warning("Teams plugin: httpx not installed")
            return False

        severity = alert.get("severity", "info")
        color = {"critical": "FF0000", "error": "FF6347", "warning": "FFA500", "info": "0078D7"}.get(severity, "808080")
        payload = {
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            "themeColor": color,
            "summary": alert.get("title", "AIDEN Alert"),
            "title": f"AIDEN · {alert.get('title', 'Alert')}",
            "text": alert.get("message", "") or "_No details_",
            "sections": [
                {
                    "facts": [
                        {"name": "Severity", "value": severity.upper()},
                        {"name": "Environment", "value": alert.get("environment", "production")},
                        {"name": "Pipeline", "value": alert.get("pipeline_name") or "N/A"},
                    ],
                }
            ],
        }

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(self.webhook_url, json=payload)
                if resp.status_code in (200, 202):
                    logger.info(f"Teams alert sent: {alert.get('title')}")
                    return True
                logger.error(f"Teams webhook returned {resp.status_code}")
                return False
        except Exception as e:
            logger.error(f"Teams alert failed: {e}")
            return False


teams_plugin = TeamsAlertPlugin()
