import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from app.core.security import get_password_hash
from app.database import AsyncSessionLocal, engine, Base
from app.models import User  # noqa: F401


async def create_test_user() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.username == "testuser"))
        existing = result.scalar_one_or_none()

        if existing:
            print("Test user already exists!")
            return

        new_user = User(
            username="testuser",
            email="test@example.com",
            full_name="Test User",
            hashed_password=get_password_hash("testpass123"),
            is_active=True,
        )
        db.add(new_user)
        await db.commit()
        print("Test user created: testuser / testpass123")


if __name__ == "__main__":
    asyncio.run(create_test_user())
