"""AIDEN Webhooks API — outbound webhook registrations with HMAC signing.

Webhooks fire on platform events (pipeline.failed, incident.created, ...)
and deliver a signed JSON payload to the registered URL. HMAC signature is
in the X-AIDEN-Signature header (hex HMAC-SHA256 of the raw body).
"""
import asyncio
import hashlib
import hmac
import json
import logging
import time
import uuid
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.database import get_db
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory registry (swap for a DB table when persistence is needed)
_webhooks: list = []
_delivery_log: list = []


class WebhookOut(BaseModel):
    id: str
    name: str
    url: str
    events: list
    is_active: bool
    created_at: str
    last_delivery: Optional[dict] = None


@router.get("/", response_model=list[WebhookOut])
async def list_webhooks(current_user: User = Depends(get_current_user)):
    """List registered outbound webhooks."""
    return _webhooks


@router.post("/", response_model=WebhookOut, status_code=201)
async def create_webhook(
    name: str = Query(..., min_length=1),
    url: str = Query(..., min_length=1),
    events: str = Query("pipeline.failed,incident.created", description="Comma-separated event types"),
    secret: str = Query("", description="HMAC signing secret"),
    current_user: User = Depends(get_current_user),
):
    """Register a webhook URL for platform events."""
    hook = {
        "id": f"wh_{uuid.uuid4().hex[:8]}",
        "name": name,
        "url": url,
        "events": [e.strip() for e in events.split(",") if e.strip()],
        "is_active": True,
        "secret": secret,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    _webhooks.append(hook)
    return {k: v for k, v in hook.items() if k != "secret"}


@router.delete("/{webhook_id}")
async def delete_webhook(
    webhook_id: str,
    current_user: User = Depends(get_current_user),
):
    global _webhooks
    before = len(_webhooks)
    _webhooks = [w for w in _webhooks if w["id"] != webhook_id]
    if len(_webhooks) == before:
        raise HTTPException(status_code=404, detail="Webhook not found")
    return {"status": "deleted", "id": webhook_id}


@router.post("/dispatch")
async def dispatch_event(
    event_type: str = Query(...),
    payload: dict = {},
    current_user: User = Depends(get_current_user),
):
    """Manually dispatch an event to all matching webhooks (testing endpoint)."""
    delivered = await deliver_event(event_type, payload)
    return {"event": event_type, "delivered_to": delivered}


@router.get("/deliveries")
async def delivery_history(limit: int = Query(50, ge=1, le=200)):
    """Recent webhook delivery attempts."""
    return _delivery_log[-limit:]


# ── Delivery engine (called by the event bus in production) ─────────────

async def deliver_event(event_type: str, payload: dict) -> list:
    """Deliver an event to all active webhooks subscribed to it."""
    targets = [w for w in _webhooks if w["is_active"] and (not w["events"] or event_type in w["events"])]
    if not targets:
        return []

    body = json.dumps({"type": event_type, "timestamp": time.time(), "data": payload}, default=str)

    async def _send(hook: dict):
        headers = {"Content-Type": "application/json"}
        if hook.get("secret"):
            sig = hmac.new(hook["secret"].encode(), body.encode(), hashlib.sha256).hexdigest()
            headers["X-AIDEN-Signature"] = sig
        status, error = 0, None
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(hook["url"], content=body, headers=headers)
                status = resp.status_code
        except Exception as e:
            error = str(e)
        record = {
            "webhook_id": hook["id"],
            "event": event_type,
            "status_code": status,
            "error": error,
            "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        _delivery_log.append(record)
        return record

    results = await asyncio.gather(*[_send(h) for h in targets])
    return [r for r in results if r["status_code"] in (200, 201, 202, 204)]
