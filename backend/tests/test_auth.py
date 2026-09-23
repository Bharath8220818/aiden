"""Authentication flow tests (Phase 2.9 / 2.10).

Covers the Phase 2 GATE matrix endpoints: login, 401 on anonymous/invalid/
expired tokens, and /auth/me identity resolution.
"""

from __future__ import annotations

import uuid
from datetime import timedelta

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.models import UserRole
from tests.helpers import seed_user


async def test_login_returns_camelcase_session(client: httpx.AsyncClient, db_session: AsyncSession) -> None:
    await seed_user(db_session, email="gate-login@acmedata.io", role=UserRole.lead)

    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "gate-login@acmedata.io", "password": "secret123"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["token"]
    assert body["expiresAt"]
    assert body["user"]["email"] == "gate-login@acmedata.io"
    assert body["user"]["systemRole"] == "lead"


async def test_login_invalid_credentials_401(client: httpx.AsyncClient) -> None:
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@acmedata.io", "password": "wrong"},
    )
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "INVALID_CREDENTIALS"


async def test_register_creates_user_without_auth(client: httpx.AsyncClient) -> None:
    """Phase 2.9: open self-registration is the one unauthenticated write."""
    resp = await client.post(
        "/api/v1/users/register",
        json={
            "email": "self-registered@acmedata.io",
            "password": "secret123",
            "full_name": "Self Registered",
        },
    )
    assert resp.status_code == 201
    assert resp.json()["email"] == "self-registered@acmedata.io"


async def test_protected_endpoint_anonymous_401(client: httpx.AsyncClient) -> None:
    """GATE: anonymous → protected API → 401 Unauthorized."""
    for path in ("/api/v1/auth/me", "/api/v1/users/me", "/api/v1/users", "/api/v1/projects"):
        resp = await client.get(path)
        assert resp.status_code == 401, f"{path} should require auth"
        assert resp.json()["error"]["code"] == "UNAUTHORIZED"


async def test_protected_endpoint_garbage_token_401(client: httpx.AsyncClient) -> None:
    resp = await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not-a-token"})
    assert resp.status_code == 401


async def test_expired_token_401(client: httpx.AsyncClient, db_session: AsyncSession) -> None:
    user = await seed_user(db_session, email="expired@acmedata.io", role=UserRole.admin)
    expired = create_access_token(str(user.id), expires_delta=timedelta(seconds=-10))
    resp = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired}"})
    assert resp.status_code == 401


async def test_token_for_deleted_user_401(client: httpx.AsyncClient) -> None:
    token = create_access_token(str(uuid.uuid4()))
    resp = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401


async def test_auth_me_resolves_identity(client: httpx.AsyncClient, db_session: AsyncSession) -> None:
    user = await seed_user(db_session, email="identity@acmedata.io", role=UserRole.engineer)
    token = create_access_token(str(user.id))

    resp = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == str(user.id)
    assert body["systemRole"] == "engineer"
