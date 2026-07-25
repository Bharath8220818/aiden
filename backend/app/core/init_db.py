"""
Database initializer — runs during application startup.

Auto-seeds default users so team members can start using the app
immediately after running `docker compose up` or `uvicorn ... --reload`.

Environment variables control seeding:
  SEED_ADMIN_EMAIL     — admin user email       (default: admin@example.com)
  SEED_ADMIN_PASSWORD  — admin user password    (default: Admin123!)
  SEED_DEMO_EMAIL      — demo user email        (default: demo@example.com)
  SEED_DEMO_PASSWORD   — demo user password     (default: demo1234)
  SKIP_DB_SEED         — set to "true" to skip  (default: false)
"""

import os
import logging

from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.models.user import User

logger = logging.getLogger(__name__)


def _should_seed() -> bool:
    """Return False if SKIP_DB_SEED is explicitly set to a truthy value."""
    return os.environ.get("SKIP_DB_SEED", "").strip().lower() not in ("true", "1", "yes")


async def ensure_default_users(db: AsyncSession) -> None:
    """Create default admin and demo users if they don't already exist.

    Safe to call every startup — checks for existing users first.
    """
    if not _should_seed():
        logger.info("DB seeding is disabled via SKIP_DB_SEED env var — skipping")
        return

    seed_configs = [
        {
            "email": os.environ.get("SEED_ADMIN_EMAIL", "admin@example.com"),
            "username": "admin",
            "full_name": "AIDEN Admin",
            "password": os.environ.get("SEED_ADMIN_PASSWORD", "Admin123!"),
            "is_superuser": True,
        },
        {
            "email": os.environ.get("SEED_DEMO_EMAIL", "demo@example.com"),
            "username": "demo",
            "full_name": "Demo User",
            "password": os.environ.get("SEED_DEMO_PASSWORD", "demo1234"),
            "is_superuser": False,
        },
    ]

    for cfg in seed_configs:
        # Check if user already exists (by email or username)
        result = await db.execute(
            select(User).where(
                or_(User.email == cfg["email"], User.username == cfg["username"])
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            logger.debug("User '%s' (%s) already exists — skipping", cfg["username"], cfg["email"])
            continue

        user = User(
            email=cfg["email"],
            username=cfg["username"],
            full_name=cfg["full_name"],
            hashed_password=get_password_hash(cfg["password"]),
            is_active=True,
            is_superuser=cfg["is_superuser"],
        )
        db.add(user)
        try:
            await db.flush()
            logger.info(
                "Created %s user: %s / %s",
                "superuser" if cfg["is_superuser"] else "demo",
                cfg["email"],
                cfg["password"],
            )
        except Exception:
            await db.rollback()
            logger.warning("Could not create user '%s' (race condition?)", cfg["username"])

    await db.commit()
