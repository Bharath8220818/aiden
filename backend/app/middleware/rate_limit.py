from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from collections import defaultdict
import time
from typing import Dict, List


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple in-memory rate limiting middleware.
    Limits requests per IP per minute.

    Skips health check endpoints to avoid false positives
    from uptime monitors.
    """

    MAX_CACHE_SIZE = 10_000

    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self._requests: Dict[str, List[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health checks
        path = request.url.path
        if path.startswith("/api/v1/health") or path == "/health":
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        minute_ago = now - 60

        # Evict oldest IPs if cache grows too large
        if len(self._requests) > self.MAX_CACHE_SIZE:
            self._requests.clear()

        # Clean old requests outside the window
        self._requests[client_ip] = [
            ts for ts in self._requests[client_ip] if ts > minute_ago
        ]

        if len(self._requests[client_ip]) >= self.requests_per_minute:
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later.",
            )

        self._requests[client_ip].append(now)
        return await call_next(request)
