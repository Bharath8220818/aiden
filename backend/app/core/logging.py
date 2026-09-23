"""Application logging configuration + structured request logging helpers."""

from __future__ import annotations

import logging
import sys
from typing import Any

from app.core.config import get_settings

_LOGGERS: set[str] = set()

_FORMAT = "%(asctime)s | %(levelname)-7s | %(name)s | %(message)s"
_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def setup_logging(level: str | None = None) -> None:
    """Configure the root logger once (no-op on repeated calls)."""
    if _LOGGERS and level is None:
        return
    settings = get_settings()
    effective = level or settings.LOG_LEVEL or "INFO"

    root = logging.getLogger()
    root.setLevel(effective.upper())

    if not root.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(logging.Formatter(_FORMAT, datefmt=_DATE_FORMAT))
        root.addHandler(handler)


def get_logger(name: str) -> logging.Logger:
    """Return a namespaced module logger (optionally configured)."""
    setup_logging()
    return logging.getLogger(name)


def log_request(
    logger: logging.Logger,
    *,
    request_id: str,
    method: str,
    path: str,
    status_code: int,
    duration_ms: float,
    user_id: str | None = None,
    extra: dict[str, Any] | None = None,
) -> None:
    """Emit a structured request log line."""
    fields = extra or {}
    fields.update(
        {
            "request_id": request_id,
            "method": method,
            "path": path,
            "status": status_code,
            "duration_ms": round(duration_ms, 2),
            "user_id": user_id,
        }
    )
    extras = " ".join(f"{k}={v}" for k, v in fields.items() if v is not None)
    logger.info("%s %s -> %s (%s) [%s]", method, path, status_code, f"{duration_ms:.1f}ms", extras)
