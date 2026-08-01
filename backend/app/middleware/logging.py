from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import time
import logging

logger = logging.getLogger("aiden.access")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Logs every request with method, path, status code, and response time.

    Health check endpoints are logged at DEBUG to avoid noise from uptime
    monitors; everything else at INFO.
    """

    async def dispatch(self, request: Request, call_next):
        start = time.time()
        response = await call_next(request)
        elapsed = time.time() - start

        is_health = request.url.path.startswith("/api/v1/health") or request.url.path == "/health"
        client_ip = request.client.host if request.client else "unknown"

        msg = (
            f"{request.method} {request.url.path} "
            f"{response.status_code} {elapsed:.3f}s "
            f"client={client_ip}"
        )

        if is_health:
            logger.debug(msg)
        else:
            logger.info(msg)

        return response
