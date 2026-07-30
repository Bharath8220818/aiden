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
        # Check if user already exists
        result = await db.execute(select(User).where(User.email == "femifriendly@gmail.com"))
        existing = result.scalar_one_or_none()

        if existing:
            print(f"✅ Test user already exists: {existing.email}")
            return

        new_user = User(
            username="femifriendly",
            email="femifriendly@gmail.com",
            full_name="Femi Friendly",
            hashed_password=get_password_hash("Femi@2005"),
            is_active=True,
        )
        db.add(new_user)
        await db.commit()
        print("✅ Test user created: femifriendly@gmail.com / Femi@2005")


if __name__ == "__main__":
    asyncio.run(create_test_user())
