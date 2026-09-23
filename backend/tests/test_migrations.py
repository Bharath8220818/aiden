"""Alembic migration test — fresh upgrade, rollback, re-upgrade (1.3)."""

from __future__ import annotations

import os
import pathlib
import shutil

from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import create_async_engine

BACKEND_DIR = pathlib.Path(__file__).resolve().parents[1]
ALEMBIC_INI = BACKEND_DIR / "alembic.ini"


def _table_names(url: str) -> set[str]:
    import asyncio

    async def _run() -> set[str]:
        engine = create_async_engine(url)
        async with engine.connect() as conn:
            result = await conn.run_sync(lambda sync_conn: inspect(sync_conn).get_table_names())
        await engine.dispose()
        return set(result)

    return asyncio.run(_run())


def test_migration_upgrade_downgrade_roundtrip(tmp_path) -> None:
    from alembic import command
    from alembic.config import Config

    # isolate from the app-level settings cache: point DATABASE_URL at a temp file
    db_url = f"sqlite+aiosqlite:///{tmp_path / 'migrate.db'}"
    old = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = db_url
    from app.core.config import get_settings

    get_settings.cache_clear()

    cfg = Config(str(ALEMBIC_INI))
    try:
        command.upgrade(cfg, "head")
        tables = _table_names(db_url)
        required = {
            "users",
            "workspaces",
            "workspace_members",
            "projects",
            "requirements",
            "architectures",
            "pipelines",
            "pipeline_runs",
            "incidents",
            "approvals",
            "audit_logs",
        }
        assert required.issubset(tables), f"missing tables after upgrade: {required - tables}"

        # rollback → app tables gone (alembic_version is retained by design)
        command.downgrade(cfg, "base")
        remaining = _table_names(db_url) - {"alembic_version"}
        assert remaining == set(), f"downgrade base should drop all tables, got {remaining}"

        # fresh re-migrate works (idempotent baseline)
        command.upgrade(cfg, "head")
        assert _table_names(db_url) == tables
    finally:
        get_settings.cache_clear()
        if old is None:
            os.environ.pop("DATABASE_URL", None)
        else:
            os.environ["DATABASE_URL"] = old
        shutil.rmtree(tmp_path, ignore_errors=True)
