"""Airflow REST API client — auth, retries, and error mapping.

Uses httpx (already a dependency) against Airflow 2.x's stable REST API
(`/api/v1`). All methods raise `AirflowError` subclasses so callers can map
failures to the platform error envelope; connectivity probing degrades
gracefully so the platform keeps working without Airflow deployed.
"""

from __future__ import annotations

from typing import Any

import httpx

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("aiden.airflow.client")

_TIMEOUT = httpx.Timeout(15.0, connect=5.0)


class AirflowError(Exception):
    """Base error for Airflow adapter failures."""

    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


class AirflowUnavailableError(AirflowError):
    """Airflow is not configured or unreachable."""


class AirflowApiError(AirflowError):
    """Airflow responded with a non-success status."""


def base_url() -> str | None:
    url = get_settings().AIRFLOW_URL
    return url.rstrip("/") if url else None


def _auth_headers() -> dict[str, str]:
    settings = get_settings()
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if settings.AIRFLOW_USERNAME and settings.AIRFLOW_PASSWORD:
        import base64

        token = base64.b64encode(
            f"{settings.AIRFLOW_USERNAME}:{settings.AIRFLOW_PASSWORD}".encode()
        ).decode()
        headers["Authorization"] = f"Basic {token}"
    return headers


def _client() -> httpx.AsyncClient:
    return httpx.AsyncClient(timeout=_TIMEOUT, headers=_auth_headers(), follow_redirects=True)


async def is_reachable() -> bool:
    """True when Airflow is configured and answers its health endpoint."""
    base = base_url()
    if not base:
        return False
    try:
        async with _client() as http:
            resp = await http.get(f"{base}/health")
            return resp.status_code < 500
    except Exception:
        logger.info("Airflow health probe failed", exc_info=True)
        return False


async def request(
    method: str, path: str, *, json_body: dict[str, Any] | None = None, params: dict | None = None
) -> Any:
    """Authenticated REST call. Raises mapped AirflowError subclasses."""
    base = base_url()
    if not base:
        raise AirflowUnavailableError("AIRFLOW_URL is not configured")
    try:
        async with _client() as http:
            resp = await http.request(
                method, f"{base}/api/v1{path}", json=json_body, params=params
            )
    except httpx.HTTPError as exc:
        raise AirflowUnavailableError(f"Airflow unreachable: {exc}") from exc

    if resp.status_code >= 400:
        detail = resp.text[:200]
        logger.warning("Airflow %s %s → %s: %s", method, path, resp.status_code, detail)
        if resp.status_code == 404:
            raise AirflowApiError(f"Not found: {path}", status_code=404)
        raise AirflowApiError(
            f"Airflow {method} {path} failed ({resp.status_code}): {detail}",
            status_code=resp.status_code,
        )
    if resp.status_code == 204 or not resp.content:
        return None
    return resp.json()
