"""Adapter registry (spec §12) — the catalog of external-system adapters.

`capabilities()` powers `/notifications/channels` and the Integration
Registry panel: every adapter reports whether it is configured, so the UI
shows honest connection state instead of guessing.
"""

from __future__ import annotations

from typing import Any

from app.core.config import get_settings
from app.integrations.mcp.jira.adapter import JiraAdapter
from app.integrations.mcp.outlook.adapter import OutlookAdapter


def email_adapter(recipients: list[str] | None = None) -> OutlookAdapter:
    return OutlookAdapter(recipients=recipients)


def jira_adapter() -> JiraAdapter:
    return JiraAdapter()


def capabilities() -> dict[str, dict[str, Any]]:
    """Status of every external channel (used by /notifications/channels)."""
    s = get_settings()
    return {
        "email": {
            "enabled": OutlookAdapter().is_configured(),
            "mode": "smtp",
            "host": s.SMTP_HOST,
        },
        "slack": {
            "enabled": bool(s.SLACK_WEBHOOK_URL),
            "mode": "incoming-webhook",
            "host": None,
        },
        "teams": {
            "enabled": bool(s.TEAMS_WEBHOOK_URL),
            "mode": "power-automate-webhook",
            "host": None,
        },
        "jira": {
            "enabled": JiraAdapter().is_configured(),
            "mode": "rest-api-v2",
            "host": s.JIRA_URL,
        },
    }
