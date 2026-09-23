"""Database adapter base — the single interface every warehouse implements.

Introspection + read-oriented execution over a live connection. Adapters are
constructed with *resolved* credentials (never raw secrets in payloads that
reach the AI or the frontend — see `services/secret_service.py`).

Contract mirrors the integration spec §3:

    test_connection / get_databases / get_schemas / get_tables /
    get_columns / execute_query / get_table_stats

Failures raise `AdapterError` (mapped by callers to the platform error
envelope). Introspection SQL is standard `information_schema` where possible;
engine-specific dialects override `_lists_sql` etc. Execution is guarded: a
denylist blocks destructive statements regardless of RBAC (defense in depth —
the SQL workspace keeps its own guard too).
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from app.core.logging import get_logger

logger = get_logger("aiden.adapters.db")

# Statements never executed through adapters (defense in depth).
_DESTRUCTIVE_RE = re.compile(
    r"\b(drop|truncate|alter|grant|revoke|create\s+user|copy\s+into)\b", re.IGNORECASE
)


@dataclass(frozen=True)
class AdapterCredentials:
    """Resolved credential bundle — built by the secret service, not the API."""

    host: str
    port: int | None = None
    database: str | None = None
    username: str | None = None
    password: str | None = None
    extra: dict[str, Any] = field(default_factory=dict)


class AdapterError(Exception):
    """Adapter operation failed (connectivity, auth, or query error)."""


class DatabaseAdapter:
    """Abstract base. Subclasses supply a sync engine + dialect SQL.

    Async API surface; sync drivers (psycopg2, mysqlclient, snowflake-
    connector) run in a worker thread via `asyncio.to_thread`.
    """

    provider_id: str = "abstract"

    def __init__(self, credentials: AdapterCredentials) -> None:
        self.credentials = credentials

    # -- engine ---------------------------------------------------------------
    def _engine(self):  # pragma: no cover - overridden
        raise NotImplementedError

    def _lists_sql(self) -> dict[str, str]:  # pragma: no cover - overridden
        """Dialect SQL for databases/schemas/tables/columns introspection."""
        raise NotImplementedError

    # -- helpers ----------------------------------------------------------------
    def _run(self, sql: str, params: dict | None = None) -> list[tuple]:
        """Execute one statement on a short-lived connection (sync, thread)."""
        import asyncio

        return asyncio.get_event_loop().run_until_complete(self._run_async(sql, params))

    async def _run_async(self, sql: str, params: dict | None = None) -> list[tuple]:
        engine = self._engine()

        def _query() -> list[tuple]:
            try:
                with engine.connect() as conn:
                    from sqlalchemy import text

                    result = conn.execute(text(sql), params or {})
                    return [tuple(row) for row in result.fetchall()]
            finally:
                engine.dispose()

        import asyncio

        return await asyncio.to_thread(_query)

    # -- public contract ----------------------------------------------------------
    async def test_connection(self) -> dict[str, Any]:
        """Round-trip probe returning {ok, latencyMs, detail}."""
        import time

        started = time.perf_counter()
        try:
            await self._run_async("SELECT 1")
        except Exception as exc:  # noqa: BLE001 — mapped to a clean bool
            raise AdapterError(f"Connection test failed: {exc}") from exc
        return {
            "ok": True,
            "latencyMs": int((time.perf_counter() - started) * 1000),
            "provider": self.provider_id,
        }

    async def get_databases(self) -> list[str]:
        rows = await self._run_async(self._lists_sql()["databases"])
        return [r[0] for r in rows]

    async def get_schemas(self, database: str | None = None) -> list[str]:
        sql = self._lists_sql()["schemas"]
        rows = await self._run_async(sql, {"database": database})
        return [r[0] for r in rows]

    async def get_tables(self, schema: str | None = None) -> list[str]:
        sql = self._lists_sql()["tables"]
        rows = await _safe(self._run_async(sql, {"schema": schema}))
        return [r[0] for r in rows]

    async def get_columns(self, table: str, schema: str | None = None) -> list[dict[str, Any]]:
        sql = self._lists_sql()["columns"]
        rows = await self._run_async(sql, {"schema": schema, "table": table})
        return [
            {"name": r[0], "dataType": r[1], "nullable": bool(r[2])} for r in rows
        ]

    async def execute_query(self, query: str, *, max_rows: int = 500) -> list[dict[str, Any]]:
        """Run a read-only SELECT with a row cap; destructive SQL is blocked."""
        stripped = query.strip().rstrip(";")
        if _DESTRUCTIVE_RE.search(stripped):
            raise AdapterError("Destructive SQL is blocked in the integration gateway")
        if not stripped.lower().startswith(("select", "with", "show", "explain", "describe")):
            raise AdapterError("Only read statements are allowed through adapters")
        engine = self._engine()

        def _query() -> list[dict[str, Any]]:
            try:
                with engine.connect() as conn:
                    from sqlalchemy import text

                    result = conn.execute(text(stripped))
                    columns = list(result.keys())
                    rows = result.fetchmany(max_rows)
                    return [dict(zip(columns, row, strict=False)) for row in rows]
            finally:
                engine.dispose()

        import asyncio

        try:
            return await asyncio.to_thread(_query)
        except Exception as exc:
            raise AdapterError(f"Query failed: {exc}") from exc

    async def get_table_stats(self, table: str, schema: str | None = None) -> dict[str, Any]:
        """Row count (best effort) — adapters may refine with engine stats."""
        schema_part = schema or "public"
        try:
            rows = await self._run_async(
                f'SELECT COUNT(*) FROM "{schema_part}"."{table}"'
            )
            return {"table": table, "schema": schema_part, "rowCount": int(rows[0][0])}
        except Exception as exc:  # noqa: BLE001 — stats are best-effort
            logger.info("Stats probe failed for %s.%s: %s", schema_part, table, exc)
            return {"table": table, "schema": schema_part, "rowCount": None}


async def _safe(awaitable):
    """Await, swallowing connectivity errors for best-effort listings."""
    try:
        return await awaitable
    except Exception:  # noqa: BLE001
        return []
