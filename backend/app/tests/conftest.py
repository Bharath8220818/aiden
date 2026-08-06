"""
Shared pytest fixtures for AIDEN backend tests.
"""

import os
import pytest
import pytest_asyncio

# Force the in-memory RAG store so tests never touch a live Qdrant server.
# Unconditional (not setdefault) so a dev-exported QDRANT_ENABLED=true cannot
# leak the live vector DB into the test run.
os.environ["QDRANT_ENABLED"] = "false"
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.user import User
from app.core.security import get_password_hash


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create an in-memory SQLite database for testing."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session

    await engine.dispose()


@pytest.fixture
def sample_user_dict():
    """Sample user data for testing."""
    return {
        "username": "testuser",
        "email": "test@example.com",
        "full_name": "Test User",
        "hashed_password": get_password_hash("testpassword123"),
        "is_active": True,
    }
