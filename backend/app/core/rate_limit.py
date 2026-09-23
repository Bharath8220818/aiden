"""Per-IP rate limiting middleware — Phase A API security (§4.2).

Fixed-window counter per client IP, in-memory. Single-instance safe; when
Phase B adds Redis this becomes the distributed counter without changing
the response contract (429 + Retry-After + standard error envelope).
"""

from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.types import ASGIApp

from app.core.config import get_settings

# Endpoints excluded from the general limiter (they have their own semantics:
# health probes are hit by platform monitors every few seconds).
EXEMPT_PREFIXES = ("/api/v1/health", "/health", "/docs", "/redoc", "/openapi.json")


class RateLimitMiddleware(BaseHTTPMiddleware):
    # Class-level store: Starlette rebuilds middleware instances per app
    # instance, but tests and hot-reload both benefit from one canonical
    # counter table that can be wiped between runs.
    _hits_store: defaultdict[str, deque[float]] = defaultdict(deque)

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)
        settings = get_settings()
        self.limit = settings.RATE_LIMIT_PER_MINUTE
        self.window = 60.0

    def _client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",", 1)[0].strip()
        return request.client.host if request.client else "unknown"

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint):
        path = request.url.path
        if any(path.startswith(p) for p in EXEMPT_PREFIXES):
            return await call_next(request)

        ip = self._client_ip(request)
        now = time.monotonic()
        hits = RateLimitMiddleware._hits_store[ip]
        while hits and now - hits[0] > self.window:
            hits.popleft()

        if len(hits) >= self.limit:
            retry_after = max(1, int(self.window - (now - hits[0])) + 1)
            return JSONResponse(
                status_code=429,
                content={
                    "error": {"code": "RATE_LIMITED", "message": "Too many requests. Slow down and retry."},
                    "message": "Too many requests. Slow down and retry.",
                    "retry_after": retry_after,
                },
                headers={"Retry-After": str(retry_after)},
            )

        hits.append(now)
        # Opportunistic cleanup so idle IPs don't hold memory forever.
        store = RateLimitMiddleware._hits_store
        if len(store) > 10_000:
            stale = [k for k, v in store.items() if not v or now - v[-1] > self.window]
            for k in stale:
                store.pop(k, None)

        return await call_next(request)
