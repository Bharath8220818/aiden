"""Async database engine / session management (SQLAlchemy 2.x + async drivers)."""

from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Any

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from app.core.config import get_settings

settings = get_settings()


def build_engine(url: str | None = None, **overrides: Any) -> AsyncEngine:
    """Create an async engine for a URL with driver-appropriate defaults."""
    url = url or settings.DATABASE_URL
    kwargs: dict[str, Any] = dict(echo=settings.DEBUG)
    if url.startswith("sqlite"):
        kwargs["poolclass"] = NullPool
        kwargs.setdefault("connect_args", {"check_same_thread": False})
    kwargs.update(overrides)
    return create_async_engine(url, **kwargs)


engine: AsyncEngine = build_engine()

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — yields a scoped async session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def check_database_connection(session: AsyncSession) -> bool:
    """Run a trivial round-trip against the database."""
    from sqlalchemy import text

    await session.execute(text("SELECT 1"))
    return True
