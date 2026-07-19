import sys
import os
from logging.config import fileConfig

from sqlalchemy import create_engine
from sqlalchemy import pool

from alembic import context

# Ensure the backend app is importable
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__))))

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Import ALL models so they register with Base.metadata
from app.database import Base  # noqa: E402
from app.models import Pipeline, User, PipelineExecution  # noqa: E402, F401

target_metadata = Base.metadata


def _sync_url(url: str) -> str:
    """Convert an async database URL (with SQLAlchemy async driver prefix)
    to a sync URL that Alembic's create_engine() can use.

    Handles:
      sqlite+aiosqlite://  ->  sqlite://
      postgresql+asyncpg:// ->  postgresql://
    """
    return url.replace("+aiosqlite", "").replace("+asyncpg", "")


def get_database_url() -> str:
    """Return the database URL, preferring the app's .env config
    over the alembic.ini fallback.

    This way the user manages DATABASE_URL in one place (.env)
    rather than duplicating it in alembic.ini.
    """
    # Try the app's settings first (reads from .env)
    try:
        from app.config import settings

        return settings.DATABASE_URL
    except Exception:
        pass

    # Fallback to alembic.ini
    return config.get_main_option("sqlalchemy.url")


def run_migrations_offline() -> None:
    url = _sync_url(get_database_url())
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    url = _sync_url(get_database_url())
    connectable = create_engine(
        url,
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
