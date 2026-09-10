"""Slack notification plugin — posts alerts to a Slack webhook.

Configure via environment variables:
    SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T000/B000/XXXX
    SLACK_ALERTS_ENABLED=true
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


class SlackAlertPlugin:
    """Notification plugin that posts alerts to a Slack incoming webhook."""

    name = "slack_alert"

    @property
    def webhook_url(self) -> str:
        return os.getenv("SLACK_WEBHOOK_URL", "")

    @property
    def enabled(self) -> bool:
        return os.getenv("SLACK_ALERTS_ENABLED", "false").lower() == "true" and bool(self.webhook_url)

    async def send_notification(self, alert: dict) -> bool:
        if not self.enabled:
            logger.info("Slack plugin: disabled or SLACK_WEBHOOK_URL not set — skipping")
            return False
        if not HTTPX_AVAILABLE:
            logger.warning("Slack plugin: httpx not installed")
            return False

        severity = alert.get("severity", "info")
        emoji = {"critical": ":rotating_light:", "error": ":x:", "warning": ":warning:", "info": ":information_source:"}.get(severity, ":bell:")
        payload = {
            "text": f"{emoji} *[{severity.upper()}] {alert.get('title', 'AIDEN Alert')}*",
            "blocks": [
                {
                    "type": "section",
                    "text": {"type": "mrkdwn", "text": f"{emoji} *{alert.get('title', 'AIDEN Alert')}*"},
                },
                {
                    "type": "section",
                    "text": {"type": "mrkdwn", "text": alert.get("message", "")[:2900] or "_No details_"},
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Severity: *{severity}* · Environment: *{alert.get('environment', 'production')}* · _AIDEN_",
                        }
                    ],
                },
            ],
        }

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(self.webhook_url, json=payload)
                if resp.status_code == 200:
                    logger.info(f"Slack alert sent: {alert.get('title')}")
                    return True
                logger.error(f"Slack webhook returned {resp.status_code}: {resp.text[:200]}")
                return False
        except Exception as e:
            logger.error(f"Slack alert failed: {e}")
            return False


slack_plugin = SlackAlertPlugin()
