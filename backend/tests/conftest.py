"""Shared pytest fixtures — in-memory SQLite + dependency overrides."""

from __future__ import annotations

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.main import app
from app.models import Base


@pytest_asyncio.fixture(autouse=True)
async def _clear_rate_limiter():
    """Reset the in-memory rate limiter around every test so request-heavy
    tests never trip the 60 req/min window."""
    from app.core.rate_limit import RateLimitMiddleware

    def reset() -> None:
        RateLimitMiddleware._hits_store.clear()  # type: ignore[attr-defined]

    reset()
    yield
    reset()


def _make_engine():
    eng = create_async_engine(
        "sqlite+aiosqlite://",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(eng.sync_engine, "connect")
    def _enable_foreign_keys(dbapi_conn, _record):
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA foreign_keys=ON")
        cur.close()

    return eng


@pytest_asyncio.fixture
async def db_engine():
    engine = _make_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session_factory(db_engine):
    return async_sessionmaker(db_engine, expire_on_commit=False)


@pytest_asyncio.fixture
async def db_session(db_session_factory):
    async with db_session_factory() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_engine):
    """HTTP client with get_db overridden to the in-memory SQLite DB."""

    factory = async_sessionmaker(db_engine, expire_on_commit=False)

    async def override_get_db():
        async with factory() as session:
            yield session
            await session.commit()

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()
