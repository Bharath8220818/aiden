"""Teams Power Automate adapter."""

from __future__ import annotations

from typing import Any

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("aiden.mcp.teams")

__all__ = ["TeamsAdapter"]


class TeamsAdapter:
    """Post MessageCard payloads to a Teams channel via Power Automate webhook."""

    def is_configured(self) -> bool:
        return bool(get_settings().TEAMS_WEBHOOK_URL)

    async def post(self, *, title: str, message: str, link: str | None, severity: str) -> str:
        url = get_settings().TEAMS_WEBHOOK_URL
        if not url:
            return "skipped: webhook not configured"
        settings = get_settings()
        payload: dict[str, Any] = {
            "@type": "MessageCard",
            "@context": "https://schema.org/extensions",
            "themeColor": {"critical": "DC2626", "high": "EA580C"}.get(severity, "2563EB"),
            "title": title,
            "text": message,
        }
        if link and settings.FRONTEND_URL:
            payload["potentialAction"] = [
                {
                    "@type": "OpenUri",
                    "name": "Review in AIDEN",
                    "targets": [{"os": "default", "uri": f"{settings.FRONTEND_URL}{link}"}],
                }
            ]
        return await _post_json(url, payload)


async def _post_json(url: str, payload: dict[str, Any]) -> str:
    import httpx

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
        if resp.status_code >= 400:
            return f"failed: webhook returned {resp.status_code}"
        return "sent"
    except Exception as exc:  # noqa: BLE001
        logger.warning("Webhook dispatch failed: %s", exc)
        return f"failed: {exc}"
