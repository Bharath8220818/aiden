"""
AIDEN Email Alert Service
Supports Brevo (300/day free), Gmail SMTP (500/day), Resend (3000/month)
Configured via environment variables.
"""
import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Optional
from dataclasses import dataclass, field
from collections import defaultdict

logger = logging.getLogger(__name__)


@dataclass
class AlertConfig:
    """Email alert configuration from environment."""
    smtp_provider: str = os.getenv("SMTP_PROVIDER", "brevo")  # brevo | gmail | resend
    smtp_host: str = os.getenv("SMTP_HOST", "smtp-relay.brevo.com")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_user: str = os.getenv("SMTP_USER", "")
    smtp_password: str = os.getenv("SMTP_PASSWORD", "")
    from_email: str = os.getenv("ALERT_FROM_EMAIL", "aiden@noreply.com")
    from_name: str = os.getenv("ALERT_FROM_NAME", "AIDEN")
    enabled: bool = os.getenv("EMAIL_ALERTS_ENABLED", "false").lower() == "true"
    # Dedup window in seconds (default 5 min)
    dedup_window: int = int(os.getenv("ALERT_DEDUP_WINDOW", "300"))


@dataclass
class AlertEvent:
    """An alert event to be processed."""
    severity: str  # critical, error, warning, info
    title: str
    message: str
    pipeline_name: str = ""
    pipeline_id: int = 0
    environment: str = "production"
    error_details: str = ""
    ai_diagnosis: str = ""
    ai_confidence: float = 0.0
    suggested_fix: str = ""
    timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class AlertRecord:
    """Record of a sent alert for dedup and audit."""
    id: int
    event: AlertEvent
    sent_at: datetime
    recipients: list
    status: str  # sent, failed, deduped


class EmailAlertService:
    """Email alert service with dedup, templating, and multi-provider support."""

    def __init__(self):
        self.config = AlertConfig()
        self._dedup_cache: dict[str, datetime] = {}
        self._alert_counter = 0
        self._alert_history: list[AlertRecord] = []

    @property
    def is_configured(self) -> bool:
        return self.config.enabled and bool(self.config.smtp_user and self.config.smtp_password)

    def _dedup_key(self, event: AlertEvent) -> str:
        """Generate dedup key from event."""
        return f"{event.severity}:{event.pipeline_name}:{event.title}"

    def _is_duplicate(self, event: AlertEvent) -> bool:
        """Check if this event was recently sent (within dedup window)."""
        key = self._dedup_key(event)
        if key in self._dedup_cache:
            last_sent = self._dedup_cache[key]
            if (datetime.utcnow() - last_sent).total_seconds() < self.config.dedup_window:
                return True
        return False

    def _render_email_html(self, event: AlertEvent) -> str:
        """Render HTML email template."""
        severity_colors = {
            "critical": "#DC2626",
            "error": "#EF4444",
            "warning": "#F59E0B",
            "info": "#3B82F6",
        }
        severity_bg = {
            "critical": "#FEF2F2",
            "error": "#FEF2F2",
            "warning": "#FFFBEB",
            "info": "#EFF6FF",
        }
        color = severity_colors.get(event.severity, "#6B7280")
        bg = severity_bg.get(event.severity, "#F9FAFB")

        diagnosis_section = ""
        if event.ai_diagnosis:
            diagnosis_section = f"""
            <div style="margin-top: 24px; padding: 16px; background: #F0FDF4; border-radius: 8px; border-left: 4px solid #22C55E;">
              <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #166534;">🤖 AI Diagnosis (confidence: {event.ai_confidence:.0%})</h3>
              <p style="margin: 0; font-size: 14px; color: #166534;">{event.ai_diagnosis}</p>
            </div>"""

        fix_section = ""
        if event.suggested_fix:
            fix_section = f"""
            <div style="margin-top: 16px; padding: 16px; background: #EFF6FF; border-radius: 8px; border-left: 4px solid #3B82F6;">
              <h3 style="margin: 0 0 8px 0; font-size: 14px; color: #1E40AF;">💡 Suggested Fix</h3>
              <p style="margin: 0; font-size: 14px; color: #1E40AF;">{event.suggested_fix}</p>
            </div>"""

        return f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="margin: 0; padding: 0; background: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
            <!-- Header -->
            <div style="padding: 16px 24px; background: #050816; border-radius: 12px 12px 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-family: 'JetBrains Mono', monospace; font-size: 16px; font-weight: bold; color: #A855F7;">AIDEN</span>
                    <span style="font-size: 12px; color: #64748B; margin-left: 8px;">Alert System</span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 4px 12px; background: {color}; color: white; border-radius: 12px; font-size: 11px; font-weight: bold; text-transform: uppercase;">{event.severity}</span>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Body -->
            <div style="padding: 24px; background: white; border: 1px solid #E2E8F0; border-top: none;">
              <h2 style="margin: 0 0 8px 0; font-size: 18px; color: #0F172A;">{event.title}</h2>
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #64748B;">
                {event.timestamp.strftime('%B %d, %Y at %H:%M UTC')} · {event.environment}
              </p>

              <!-- Details -->
              <div style="background: {bg}; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 4px 0; font-size: 13px; color: #64748B; width: 120px;">Pipeline</td>
                    <td style="padding: 4px 0; font-size: 13px; color: #0F172A; font-weight: 600;">{event.pipeline_name or 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; font-size: 13px; color: #64748B;">Status</td>
                    <td style="padding: 4px 0; font-size: 13px; color: {color}; font-weight: 600;">{event.severity.upper()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; font-size: 13px; color: #64748B;">Message</td>
                    <td style="padding: 4px 0; font-size: 13px; color: #0F172A;">{event.message}</td>
                  </tr>
                </table>
              </div>

              {f'<div style="margin-bottom: 16px; padding: 12px; background: #FEF2F2; border-radius: 8px; font-family: monospace; font-size: 12px; color: #991B1B; white-space: pre-wrap; overflow-x: auto;">{event.error_details}</div>' if event.error_details else ''}

              {diagnosis_section}
              {fix_section}
            </div>

            <!-- Footer -->
            <div style="padding: 16px 24px; background: #F8FAFC; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; font-size: 12px; color: #94A3B8; text-align: center;">
                Sent by AIDEN · Autonomous Intelligence Data Engineering Nexus<br>
                <a href="#" style="color: #7C3AED;">Open Dashboard</a> · <a href="#" style="color: #7C3AED;">Manage Alerts</a> · <a href="#" style="color: #7C3AED;">Unsubscribe</a>
              </p>
            </div>
          </div>
        </body>
        </html>
        """

    def _render_email_text(self, event: AlertEvent) -> str:
        """Render plain text email for fallback."""
        lines = [
            f"AIDEN Alert [{event.severity.upper()}]",
            f"",
            f"Title: {event.title}",
            f"Pipeline: {event.pipeline_name or 'N/A'}",
            f"Environment: {event.environment}",
            f"Time: {event.timestamp.strftime('%Y-%m-%d %H:%M UTC')}",
            f"",
            f"Message: {event.message}",
        ]
        if event.error_details:
            lines.extend(["", f"Error Details:", event.error_details])
        if event.ai_diagnosis:
            lines.extend(["", f"AI Diagnosis ({event.ai_confidence:.0%}):", event.ai_diagnosis])
        if event.suggested_fix:
            lines.extend(["", f"Suggested Fix:", event.suggested_fix])
        lines.extend(["", "---", "Sent by AIDEN · Autonomous Intelligence Data Engineering Nexus"])
        return "\n".join(lines)

    def _send_smtp(self, to_emails: list[str], subject: str, html: str, text: str) -> bool:
        """Send email via SMTP."""
        if not self.is_configured:
            logger.warning("Email alerts not configured — set SMTP_USER and SMTP_PASSWORD")
            return False

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{self.config.from_name} <{self.config.from_email}>"
            msg["To"] = ", ".join(to_emails)

            msg.attach(MIMEText(text, "plain"))
            msg.attach(MIMEText(html, "html"))

            with smtplib.SMTP(self.config.smtp_host, self.config.smtp_port) as server:
                server.ehlo()
                if self.config.smtp_port != 25:
                    server.starttls()
                server.login(self.config.smtp_user, self.config.smtp_password)
                server.sendmail(self.config.from_email, to_emails, msg.as_string())

            logger.info(f"Alert email sent to {to_emails}: {subject}")
            return True

        except Exception as e:
            logger.error(f"Failed to send alert email: {e}")
            return False

    def send_alert(
        self,
        event: AlertEvent,
        recipients: list[str],
    ) -> AlertRecord:
        """
        Process and send an alert email.
        Handles dedup, templating, and delivery.
        """
        self._alert_counter += 1

        # Dedup check
        if self._is_duplicate(event):
            record = AlertRecord(
                id=self._alert_counter,
                event=event,
                sent_at=datetime.utcnow(),
                recipients=recipients,
                status="deduped",
            )
            self._alert_history.append(record)
            logger.info(f"Alert deduped: {self._dedup_key(event)}")
            return record

        # Render
        html = self._render_email_html(event)
        text = self._render_email_text(event)
        subject = f"[AIDEN][{event.severity.upper()}] {event.title}"

        # Send
        sent = self._send_smtp(recipients, subject, html, text)

        # Record
        record = AlertRecord(
            id=self._alert_counter,
            event=event,
            sent_at=datetime.utcnow(),
            recipients=recipients,
            status="sent" if sent else "failed",
        )
        self._alert_history.append(record)

        # Update dedup cache
        self._dedup_cache[self._dedup_key(event)] = datetime.utcnow()

        return record

    def send_pipeline_failure_alert(
        self,
        pipeline_name: str,
        pipeline_id: int,
        error: str,
        environment: str = "production",
        recipients: Optional[list[str]] = None,
        ai_diagnosis: str = "",
        ai_confidence: float = 0.0,
        suggested_fix: str = "",
    ) -> AlertRecord:
        """Convenience method for pipeline failure alerts."""
        event = AlertEvent(
            severity="error",
            title=f"Pipeline Failed: {pipeline_name}",
            message=f"Pipeline '{pipeline_name}' (#{pipeline_id}) has failed in {environment}.",
            pipeline_name=pipeline_name,
            pipeline_id=pipeline_id,
            environment=environment,
            error_details=error,
            ai_diagnosis=ai_diagnosis,
            ai_confidence=ai_confidence,
            suggested_fix=suggested_fix,
        )
        return self.send_alert(event, recipients or [])

    def get_alert_history(self, limit: int = 50) -> list[dict]:
        """Get recent alert history."""
        return [
            {
                "id": r.id,
                "severity": r.event.severity,
                "title": r.event.title,
                "pipeline": r.event.pipeline_name,
                "sent_at": r.sent_at.isoformat(),
                "recipients": r.recipients,
                "status": r.status,
            }
            for r in self._alert_history[-limit:]
        ]

    def get_stats(self) -> dict:
        """Get alert statistics."""
        now = datetime.utcnow()
        last_24h = [r for r in self._alert_history if (now - r.sent_at).total_seconds() < 86400]
        return {
            "total_alerts": len(self._alert_history),
            "last_24h": len(last_24h),
            "sent": sum(1 for r in self._alert_history if r.status == "sent"),
            "failed": sum(1 for r in self._alert_history if r.status == "failed"),
            "deduped": sum(1 for r in self._alert_history if r.status == "deduped"),
            "configured": self.is_configured,
            "provider": self.config.smtp_provider,
        }


# Singleton
email_alert_service = EmailAlertService()
