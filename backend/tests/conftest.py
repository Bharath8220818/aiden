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

from app.main import app
from app.database import Base, get_db
from app.models import Pipeline, User, ApprovalRequest, AuditLogEntry, AnalyticsEvent  # noqa: F401 — register models
from app.core.security import get_password_hash

# ─── Test Database (in-memory to avoid file locking) ────────────────────
TEST_DATABASE_URL = "sqlite+aiosqlite://"
# Note: in-memory SQLite means each engine creates an isolated DB.
# Because the engine is module-scoped, all tests within the same
# process share the same in-memory DB. Fixtures handle table creation
# and cleanup per test via create_all / drop_all.

engine = create_async_engine(TEST_DATABASE_URL, echo=False)
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
