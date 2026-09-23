"""MySQL adapter — information_schema introspection over a sync driver."""

from __future__ import annotations

from typing import Any

from sqlalchemy import create_engine

from app.core.logging import get_logger
from app.integrations.databases.base import AdapterCredentials, DatabaseAdapter

logger = get_logger("aiden.adapters.mysql")


class MySQLAdapter(DatabaseAdapter):
    provider_id = "mysql"

    def __init__(self, credentials: AdapterCredentials) -> None:
        super().__init__(credentials)
        self._engine_instance: Any = None

    def _url(self) -> str:
        auth = f"{self.credentials.username}:{self.credentials.password}@" if self.credentials.username else ""
        port = self.credentials.port or 3306
        database = self.credentials.database or ""
        return f"mysql+pymysql://{auth}{self.credentials.host}:{port}/{database}"

    def _engine(self):
        if self._engine_instance is None:
            self._engine_instance = create_engine(
                self._url(), pool_pre_ping=True, connect_args={"connect_timeout": 8}
            )
        return self._engine_instance

    def _lists_sql(self) -> dict[str, str]:
        return {
            "databases": "SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('mysql', 'information_schema', 'performance_schema', 'sys') ORDER BY schema_name",
            "schemas": "SELECT DISTINCT table_schema FROM information_schema.tables WHERE table_schema NOT IN ('mysql', 'information_schema', 'performance_schema', 'sys') ORDER BY table_schema",
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

    async def get_tables(self, schema: str | None = None) -> list[str]:
        # MySQL: schema == database; default to the connected one.
        return await super().get_tables(schema or self.credentials.database)

    async def get_columns(self, table: str, schema: str | None = None) -> list[dict[str, Any]]:
        return await super().get_columns(table, schema or self.credentials.database)

    async def get_table_stats(self, table: str, schema: str | None = None) -> dict[str, Any]:
        schema_part = schema or self.credentials.database
        sql = (
            "SELECT table_rows FROM information_schema.tables "
            "WHERE table_schema = :schema AND table_name = :table"
        )
        try:
            rows = await self._run_async(sql, {"schema": schema_part, "table": table})
            estimate = int(rows[0][0]) if rows and rows[0][0] is not None else None
            return {"table": table, "schema": schema_part, "rowCount": estimate}
        except Exception:  # noqa: BLE001
            return await super().get_table_stats(table, schema_part)
