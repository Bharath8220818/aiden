"""User + auth tests (Phase 1.7 / Phase 2.9 — admin-gated administration)."""

from __future__ import annotations

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password
from app.models import User, UserRole
from tests.helpers import seed_user


async def _admin(db_session: AsyncSession) -> dict[str, str]:
    user = await seed_user(db_session, role=UserRole.admin)
    return {"Authorization": f"Bearer {create_access_token(str(user.id))}"}


async def _seed_user(
    db: AsyncSession, *, email: str = "u@acmedata.io", role: UserRole = UserRole.engineer
) -> User:
    user = User(
        email=email,
        full_name="Test User",
        password_hash=hash_password("secret123"),
        role=role,
    )
    db.add(user)
    await db.flush()
    return user


async def test_create_user_via_api(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _admin(db_session)
    resp = await client.post(
        "/api/v1/users",
        json={
            "email": "new@acmedata.io",
            "password": "secret123",
            "full_name": "New User",
            "role": "lead",
        },
        headers=headers,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["email"] == "new@acmedata.io"
    assert body["name"] == "New User"
    assert body["systemRole"] == "lead"
    assert body["roleTitle"] == "Lead Data Engineer"
    assert "id" in body


async def test_create_user_duplicate_email_returns_409(client: AsyncClient, db_session: AsyncSession) -> None:
    headers = await _admin(db_session)
    await _seed_user(db_session, email="dup@acmedata.io")
    await db_session.commit()

    resp = await client.post(
        "/api/v1/users",
        json={"email": "dup@acmedata.io", "password": "secret123", "full_name": "Dup"},
        headers=headers,
    )

    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "EMAIL_ALREADY_EXISTS"


async def test_login_success_returns_camelcase_session(client: AsyncClient, db_session: AsyncSession) -> None:
    from app.models import Workspace, WorkspaceMember, WorkspaceRole

    user = await _seed_user(db_session, email="login@acmedata.io", role=UserRole.lead)
    ws = Workspace(name="Login WS", slug="login-ws")
    db_session.add(ws)
    await db_session.flush()
    db_session.add(WorkspaceMember(workspace_id=ws.id, user_id=user.id, role=WorkspaceRole.owner))
    await db_session.commit()

    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "login@acmedata.io", "password": "secret123"},
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["token"]
    assert body["expiresAt"]
    assert body["user"]["email"] == "login@acmedata.io"
    assert body["user"]["systemRole"] == "lead"
    assert body["user"]["workspaceName"] == "Login WS"


async def test_login_invalid_credentials_returns_401(client: AsyncClient) -> None:
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@acmedata.io", "password": "wrong"},
    )
    assert resp.status_code == 401
    body = resp.json()
    assert body["error"]["code"] == "INVALID_CREDENTIALS"
    assert "request_id" in body["error"]


async def test_me_requires_auth(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/users/me")
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "UNAUTHORIZED"


async def test_me_with_bearer_token(client: AsyncClient, db_session: AsyncSession) -> None:
    user = await _seed_user(db_session, email="me@acmedata.io")
    await db_session.commit()
    token = create_access_token(str(user.id))

    resp = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["email"] == "me@acmedata.io"
    assert resp.json()["systemRole"] == "engineer"


async def test_me_rejects_garbage_token(client: AsyncClient) -> None:
    resp = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": "Bearer not-a-real-token"},
    )
    assert resp.status_code == 401
