"""PostgreSQL adapter — information_schema introspection over psycopg2."""

from __future__ import annotations

from typing import Any

from sqlalchemy import create_engine

from app.core.logging import get_logger
from app.integrations.databases.base import AdapterCredentials, DatabaseAdapter

logger = get_logger("aiden.adapters.postgresql")


class PostgresAdapter(DatabaseAdapter):
    provider_id = "postgresql"

    def __init__(self, credentials: AdapterCredentials) -> None:
        super().__init__(credentials)
        self._engines: dict[str, Any] = {}
        self._current_database: str | None = None

    def _url(self, database: str | None = None) -> str:
        db = database or self.credentials.database or "postgres"
        auth = f"{self.credentials.username}:{self.credentials.password}@" if self.credentials.username else ""
        port = self.credentials.port or 5432
        return f"postgresql+psycopg2://{auth}{self.credentials.host}:{port}/{db}"

    def _engine(self):
        """Engine bound to the selected database (databases() needs re-connects)."""
        database = self.credentials.extra.get("_database") or self.credentials.database or "postgres"
        if database not in self._engines:
            self._engines[database] = create_engine(
                self._url(database), pool_pre_ping=True, connect_args={"connect_timeout": 8}
            )
        return self._engines[database]

    def _lists_sql(self) -> dict[str, str]:
        return {
            "databases": (
                "SELECT datname FROM pg_database "
                "WHERE datistemplate = false ORDER BY datname"
            ),
            "schemas": (
                "SELECT schema_name FROM information_schema.schemata "
                "WHERE schema_name NOT IN ('pg_catalog', 'information_schema') "
                "AND schema_name NOT LIKE 'pg_%' ORDER BY schema_name"
            ),
            "tables": (
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = :schema AND table_type = 'BASE TABLE' "
                "ORDER BY table_name"
            ),
            "columns": (
                "SELECT column_name, data_type, is_nullable = 'YES' "
                "FROM information_schema.columns "
                "WHERE table_schema = :schema AND table_name = :table "
                "ORDER BY ordinal_position"
            ),
        }

    async def get_databases(self) -> list[str]:
        return await super().get_databases()

    async def get_schemas(self, database: str | None = None) -> list[str]:
        return await super().get_schemas(database)

    async def execute_query(self, query: str, *, max_rows: int = 500) -> list[dict[str, Any]]:
        return await super().execute_query(query, max_rows=max_rows)

    async def get_table_stats(self, table: str, schema: str | None = None) -> dict[str, Any]:
        """Live row estimate from pg_class (no full scan)."""
        schema_part = schema or "public"
        sql = (
            "SELECT reltuples::bigint FROM pg_class c "
            "JOIN pg_namespace n ON n.oid = c.relnamespace "
            "WHERE n.nspname = :schema AND c.relname = :table"
        )
        try:
            rows = await self._run_async(sql, {"schema": schema_part, "table": table})
            estimate = int(rows[0][0]) if rows and rows[0][0] is not None else None
            return {"table": table, "schema": schema_part, "rowCount": estimate}
        except Exception:  # noqa: BLE001
            return await super().get_table_stats(table, schema)
