"""Error-handling & API-surface tests — envelope, validation, request ids."""

from __future__ import annotations

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.models import UserRole
from tests.helpers import seed_user


def _assert_envelope(body: dict, status_code_part: str) -> None:
    assert "error" in body, "error envelope missing"
    assert body["error"]["code"] == status_code_part
    assert "message" in body
    assert body["message"], "top-level message must be non-empty"
    # request_id is set by request middleware and threaded into the envelope
    assert body["error"]["request_id"]


async def test_unknown_route_404(client: AsyncClient) -> None:
    r = await client.get("/api/v1/definitely-not-a-route")
    assert r.status_code == 404
    assert r.headers.get("X-Request-ID")
    _assert_envelope(r.json(), "NOT_FOUND")


async def test_validation_error_422(client: AsyncClient, db_session: AsyncSession) -> None:
    admin = await seed_user(db_session, role=UserRole.admin)
    headers = {"Authorization": f"Bearer {create_access_token(str(admin.id))}"}

    # missing required `email`/`password` → FastAPI validation
    r = await client.post("/api/v1/users", json={"full_name": "No Email"}, headers=headers)
    assert r.status_code == 422
    body = r.json()
    _assert_envelope(body, "VALIDATION_ERROR")
    assert "email" in body["error"]["message"].lower()


async def test_validation_error_bad_type(client: AsyncClient, db_session: AsyncSession) -> None:
    admin = await seed_user(db_session, role=UserRole.admin)
    headers = {"Authorization": f"Bearer {create_access_token(str(admin.id))}"}

    r = await client.post(
        "/api/v1/users",
        json={"email": "x@y.io", "password": 123, "full_name": "N"},
        headers=headers,
    )
    assert r.status_code == 422
    _assert_envelope(r.json(), "VALIDATION_ERROR")


async def test_docs_and_openapi_available(client: AsyncClient) -> None:
    r = await client.get("/docs")
    assert r.status_code == 200
    assert "/api/v1/openapi.json" in r.text or "swagger" in r.text.lower()
    r2 = await client.get("/api/v1/openapi.json")
    assert r2.status_code == 200
    spec = r2.json()
    assert spec["info"]["title"]
    # phase 0/1/2 routers all present
    for path in [
        "/api/v1/health/healthz",
        "/api/v1/auth/login",
        "/api/v1/users",
        "/api/v1/workspaces",
        "/api/v1/projects",
        "/api/v1/requirements",
        "/api/v1/pipelines",
        "/api/v1/overview",
    ]:
        assert path in spec["paths"]


async def test_response_headers_include_request_id(client: AsyncClient) -> None:
    r = await client.get("/api/v1/health/healthz")
    assert r.status_code == 200
    assert r.headers.get("X-Request-ID")


async def test_auth_required_returns_401(client: AsyncClient) -> None:
    r = await client.get("/api/v1/users/me")
    assert r.status_code == 401
    _assert_envelope(r.json(), "UNAUTHORIZED")
