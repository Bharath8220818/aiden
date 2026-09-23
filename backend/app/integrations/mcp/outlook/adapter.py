"""Outlook / SMTP email adapter (spec §5, §12).

AIDEN → NotificationService → this adapter → Outlook (or any SMTP provider).
Gmail is NOT assumed available (the connector is admin-disabled in the
current environment); any SMTP host works, so Outlook/Gmail/SES are just
configuration. Delivery failures never raise — the caller reports honestly.
"""

from __future__ import annotations

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("aiden.mcp.outlook")

__all__ = ["OutlookAdapter"]


class OutlookAdapter:
    """Email delivery over SMTP. `send()` never raises."""

    def __init__(self, *, recipients: list[str] | None = None) -> None:
        self.settings = get_settings()
        self.recipients = recipients or []

    def is_configured(self) -> bool:
        return bool(self.settings.SMTP_HOST and self.settings.SMTP_FROM)

    async def send(self, *, subject: str, body: str, link: str | None = None) -> str:
        """Send one email; returns 'sent:<n>' / 'skipped: <reason>' / 'failed: <error>'."""
        if not self.is_configured():
            return "skipped: smtp not configured"
        recipients = self.recipients
        if not recipients:
            return "skipped: no recipients"

        import asyncio

        settings = self.settings

        def _send() -> None:
            import smtplib
            from email.message import EmailMessage

            msg = EmailMessage()
            msg["Subject"] = subject
            msg["From"] = settings.SMTP_FROM
            msg["To"] = ", ".join(recipients)
            content = body
            if link:
                content += f"\n\nOpen in AIDEN: {link}"
            msg.set_content(content)
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as smtp:
                if settings.SMTP_TLS:
                    smtp.starttls()
                if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                    smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                smtp.send_message(msg)

        try:
            await asyncio.to_thread(_send)
            return f"sent:{len(recipients)}"
        except Exception as exc:  # noqa: BLE001 — delivery failures never raise
            logger.warning("Email dispatch failed: %s", exc)
            return f"failed: {exc}"
