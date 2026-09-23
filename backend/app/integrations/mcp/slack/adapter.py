"""Slack incoming-webhook adapter."""

from __future__ import annotations

from typing import Any

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("aiden.mcp.slack")

__all__ = ["SlackAdapter"]


class SlackAdapter:
    """Post message cards to a Slack channel via incoming webhook."""

    def is_configured(self) -> bool:
        return bool(get_settings().SLACK_WEBHOOK_URL)

    async def post(self, *, title: str, message: str, link: str | None, severity: str) -> str:
        url = get_settings().SLACK_WEBHOOK_URL
        if not url:
            return "skipped: webhook not configured"
        emoji = {"critical": ":rotating_light:", "high": ":warning:"}.get(
            severity, ":information_source:"
        )
        text = f"{emoji} *{title}*\n{message}"
        if link:
            frontend = get_settings().FRONTEND_URL or ""
            text += f"\n<{frontend}{link}|Review in AIDEN>"
        return await _post_json(url, {"text": text})


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
