"""Sync guard — bridge the ml contracts to the backend model registry.

`backend_registry()` imports `app.ai.models.registry` by inserting the
backend directory on sys.path (works from any cwd). Returns None when the
backend package or its dependencies are unavailable so ml tooling can
degrade gracefully instead of crashing.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

_BACKEND = Path(__file__).resolve().parents[1] / "backend"
_registry: Any = None
_registry_error: str | None = None


def backend_registry() -> Any | None:
    """The backend registry module, or None if it cannot be imported."""
    global _registry, _registry_error
    if _registry is not None:
        return _registry
    if _registry_error is not None:
        return None
    try:
        sys.path.insert(0, str(_BACKEND))
        from app.ai.models import registry  # type: ignore[import-not-found]

        _registry = registry
        return _registry
    except Exception as exc:  # noqa: BLE001 — any import failure means "no backend here"
        _registry_error = str(exc)
        return None
