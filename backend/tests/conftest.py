"""
Test fixtures for AIDEN backend.
Provides an async test client with an isolated SQLite test database.

Fixtures are function-scoped (not session-scoped) to avoid issues with
pytest-asyncio strict mode and session-scoped async fixtures.
"""

import uuid
import pytest
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.models import Pipeline, User, ApprovalRequest, AuditLogEntry, AnalyticsEvent  # noqa: F401 — register models
from app.core.security import get_password_hash

# ─── Test Database (in-memory to avoid file locking) ────────────────────
TEST_DATABASE_URL = "sqlite+aiosqlite://"
# StaticPool keeps ONE shared in-memory DB across ALL connections/sessions.
# This is required because the run endpoint spawns a background executor
# with its own session factory (patched to TestingSessionLocal below) —
# without StaticPool, each new connection would get a fresh empty DB.

engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


@pytest.fixture(scope="function")
async def db_engine():
    """Create tables before each test, drop them after."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(scope="function")
async def db_session(db_engine):
    """Provide a fresh database session for each test function.

    Committed data persists across tests within the same SQLite file,
    so tests use unique usernames/emails to avoid collisions.
    """
    async with TestingSessionLocal() as session:
        yield session
        await session.rollback()
        await session.close()


@pytest.fixture(scope="function")
async def client(db_session):
    """Provide an HTTP client with the test database injected via dependency override."""

    async def _get_db_override():
        yield db_session

    app.dependency_overrides[get_db] = _get_db_override

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
async def test_user(db_session):
    """Create a test user with unique username/email to avoid isolation conflicts."""
    suffix = uuid.uuid4().hex[:8]
    user = User(
        username=f"testuser_{suffix}",
        email=f"test_{suffix}@example.com",
        full_name="Test User",
        hashed_password=get_password_hash("SecurePass123"),
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture(scope="function")
async def auth_headers(client, test_user):
    """Get JWT auth headers by logging in as the dynamically created test user."""
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": test_user.username, "password": "SecurePass123"},
    )
    token = response.json().get("access_token")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function", autouse=True)
def patch_background_session(monkeypatch):
    """Point the run endpoint's background executor at the test database.

    ``run_pipeline`` creates a dedicated session via ``AsyncSessionLocal``
    (imported from ``app.database``) so the request-scoped session is never
    shared with the background task. Tests must therefore redirect that
    factory to the in-memory test DB, or the executor would silently look
    for pipeline/execution rows in the real Supabase database.
    """
    monkeypatch.setattr("app.database.AsyncSessionLocal", TestingSessionLocal)
