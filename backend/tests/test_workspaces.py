"""Workspace CRUD + membership tests (authenticated — Phase 2 enforcement)."""

from __future__ import annotations

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.models import User, UserRole
from tests.helpers import seed_user


async def _engineer(db_session: AsyncSession) -> tuple[User, dict[str, str]]:
    """Fresh engineer + Bearer headers. Workspace creation makes them owner."""
    user = await seed_user(db_session, role=UserRole.engineer)
    return user, {"Authorization": f"Bearer {create_access_token(str(user.id))}"}


async def test_create_workspace(client: AsyncClient, db_session: AsyncSession) -> None:
    _, headers = await _engineer(db_session)
    resp = await client.post(
        "/api/v1/workspaces",
        json={"name": "Acme Data Platform", "description": "Core platform"},
        headers=headers,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Acme Data Platform"
    assert body["slug"] == "acme-data-platform"
    assert body["member_count"] == 1  # creator recorded as owner


async def test_create_workspace_custom_slug(client: AsyncClient, db_session: AsyncSession) -> None:
    _, headers = await _engineer(db_session)
    resp = await client.post(
        "/api/v1/workspaces",
        json={"name": "Retail Analytics", "slug": "retail-analytics", "description": None},
        headers=headers,
    )
    assert resp.status_code == 201
    assert resp.json()["slug"] == "retail-analytics"


async def test_duplicate_slug_returns_409(client: AsyncClient, db_session: AsyncSession) -> None:
    _, headers = await _engineer(db_session)
    payload = {"name": "First", "slug": "same-slug"}
    assert (await client.post("/api/v1/workspaces", json=payload, headers=headers)).status_code == 201
    resp = await client.post("/api/v1/workspaces", json=payload, headers=headers)
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "CONFLICT"


async def test_list_workspaces_scoped_to_membership(client: AsyncClient, db_session: AsyncSession) -> None:
    _, headers = await _engineer(db_session)
    for name in ("Acme", "Retail", "Customer 360"):
        await client.post("/api/v1/workspaces", json={"name": name}, headers=headers)
    resp = await client.get("/api/v1/workspaces", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 3  # creator owns all three → sees all three
    assert {item["name"] for item in body["items"]} == {"Acme", "Retail", "Customer 360"}


async def test_get_update_delete_workspace(client: AsyncClient, db_session: AsyncSession) -> None:
    _, headers = await _engineer(db_session)
    created = (await client.post("/api/v1/workspaces", json={"name": "Biz"}, headers=headers)).json()
    ws_id = created["id"]

    got = await client.get(f"/api/v1/workspaces/{ws_id}", headers=headers)
    assert got.status_code == 200
    assert got.json()["slug"] == "biz"

    updated = await client.put(
        f"/api/v1/workspaces/{ws_id}",
        json={"name": "Biz Enterprise", "description": "updated"},
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Biz Enterprise"

    deleted = await client.delete(f"/api/v1/workspaces/{ws_id}", headers=headers)
    assert deleted.status_code == 204

    missing = await client.get(f"/api/v1/workspaces/{ws_id}", headers=headers)
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "NOT_FOUND"


async def test_membership_endpoints(client: AsyncClient, db_session: AsyncSession) -> None:
    _, headers = await _engineer(db_session)
    ws = (await client.post("/api/v1/workspaces", json={"name": "Member WS"}, headers=headers)).json()
    ws_id = ws["id"]

    # Second user via open self-registration (no admin needed)
    user = (
        await client.post(
            "/api/v1/users/register",
            json={"email": "member@acmedata.io", "password": "secret123", "full_name": "Membership"},
        )
    ).json()
    user_id = user["id"]

    add = await client.post(
        f"/api/v1/workspaces/{ws_id}/members",
        json={"user_id": user_id, "role": "member"},
        headers=headers,
    )
    assert add.status_code == 201
    assert add.json()["user_email"] == "member@acmedata.io"

    # Creator is auto-added as owner, so the added member makes 2.
    listing = await client.get(f"/api/v1/workspaces/{ws_id}/members", headers=headers)
    assert listing.status_code == 200
    assert len(listing.json()) == 2

    detail = await client.get(f"/api/v1/workspaces/{ws_id}", headers=headers)
    assert detail.json()["member_count"] == 2

    removed = await client.delete(f"/api/v1/workspaces/{ws_id}/members/{user_id}", headers=headers)
    assert removed.status_code == 204

    listing = await client.get(f"/api/v1/workspaces/{ws_id}/members", headers=headers)
    assert len(listing.json()) == 1  # only the owner remains


async def test_workspace_not_found(client: AsyncClient, db_session: AsyncSession) -> None:
    _, headers = await _engineer(db_session)
    resp = await client.get("/api/v1/workspaces/00000000-0000-0000-0000-000000000000", headers=headers)
    assert resp.status_code == 404
