"""Health endpoint tests (Phase 0.6)."""

from __future__ import annotations

from httpx import AsyncClient


async def test_healthz_returns_healthy(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/health/healthz")
    assert resp.status_code == 200
    assert resp.json() == {"status": "healthy"}


async def test_full_health_reports_database_ok(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/health/full")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] in {"healthy", "degraded"}
    assert body["checks"]["database"]["status"] == "ok"
    assert "redis" in body["checks"]
    assert "ollama" in body["checks"]


async def test_root_meta(client: AsyncClient) -> None:
    resp = await client.get("/")
    assert resp.status_code == 200
    assert resp.json()["service"] == "AIDEN Backend"


async def test_openapi_documents_all_v1_routes(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/openapi.json")
    assert resp.status_code == 200
    paths = resp.json()["paths"]
    assert "/api/v1/health/healthz" in paths
    assert "/api/v1/auth/login" in paths
    assert "/api/v1/users/me" in paths
    assert "/api/v1/workspaces" in paths
    assert "/api/v1/projects" in paths
