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


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    # SQLite + aiosqlite doesn't work offline; rewrite to sqlite:// for URL parsing
    safe_url = url.replace("+aiosqlite", "")
    context.configure(
        url=safe_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    url = config.get_main_option("sqlalchemy.url")
    safe_url = url.replace("+aiosqlite", "")
    connectable = create_engine(
        safe_url,
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
