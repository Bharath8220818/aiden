"""Jira adapter (spec §1 note) — issue creation via Jira REST API v2.

Config-driven, not plugin-discovered: set `JIRA_URL`, `JIRA_EMAIL` and
`JIRA_API_TOKEN` (Basic auth with an API token is the standard Atlassian
cloud pattern). Until configured the adapter reports
`skipped: jira not configured` — the chat intent and the
`team.jira_create_issue` tool degrade honestly and never fabricate a
ticket.
"""

from __future__ import annotations

from typing import Any

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("aiden.mcp.jira")

__all__ = ["JiraAdapter"]


class JiraAdapter:
    """Thin REST client for creating Jira issues. `create_issue()` never raises."""

    def is_configured(self) -> bool:
        s = get_settings()
        return bool(s.JIRA_URL and s.JIRA_EMAIL and s.JIRA_API_TOKEN)

    async def create_issue(
        self,
        *,
        summary: str,
        description: str,
        assignee_name: str | None = None,
        project_key: str | None = None,
        issue_type: str = "Task",
        link: str | None = None,
    ) -> dict[str, Any]:
        """Create one issue; returns {status: ...} with key/url when sent."""
        s = get_settings()
        if not self.is_configured():
            return {"status": "skipped: jira not configured"}
        if not project_key:
            project_key = s.JIRA_PROJECT_KEY

        import base64

        auth = base64.b64encode(f"{s.JIRA_EMAIL}:{s.JIRA_API_TOKEN}".encode()).decode()
        headers = {"Authorization": f"Basic {auth}", "Content-Type": "application/json"}
        payload: dict[str, Any] = {
            "fields": {
                "project": {"key": project_key},
                "summary": summary[:255],
                "issuetype": {"name": issue_type},
                "description": description,
            }
        }

        import httpx

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"{s.JIRA_URL.rstrip('/')}/rest/api/2/issue",
                    json=payload,
                    headers=headers,
                )
            if resp.status_code >= 400:
                return {"status": f"failed: jira returned {resp.status_code}"}
            data = resp.json()
            return {
                "status": "sent",
                "key": data.get("key"),
                "url": f"{s.JIRA_URL.rstrip('/')}/browse/{data.get('key')}",
                "assigneeName": assignee_name,
            }
        except Exception as exc:  # noqa: BLE001 — failures never raise
            logger.warning("Jira issue creation failed: %s", exc)
            return {"status": f"failed: {exc}"}
