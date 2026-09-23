"""Snowflake adapter — REST/SQL via the SQLAlchemy snowflake dialect when the
`snowflake-sqlalchemy` extra is installed; otherwise a clear AdapterError.

Credentials follow Snowflake account-URL conventions:
    extra: {account: "acme.eu-central-1", warehouse: "COMPUTE_WH", role: "TRANSFORMER"}
The account identifier + `snowflakecomputing.com` builds the host when the
caller supplies `account` instead of a full host.
"""

from __future__ import annotations

from typing import Any

from app.core.logging import get_logger
from app.integrations.databases.base import (
    AdapterCredentials,
    AdapterError,
    DatabaseAdapter,
)

logger = get_logger("aiden.adapters.snowflake")


class SnowflakeAdapter(DatabaseAdapter):
    provider_id = "snowflake"

    def __init__(self, credentials: AdapterCredentials) -> None:
        super().__init__(credentials)
        self._engine_instance: Any = None

    def _engine(self):
        try:
            from sqlalchemy import create_engine
        except Exception as exc:  # pragma: no cover
            raise AdapterError("SQLAlchemy unavailable") from exc
        if self._engine_instance is None:
            try:
                import snowflake.sqlalchemy  # noqa: F401
            except ImportError as exc:
                raise AdapterError(
                    "Snowflake driver not installed — add `snowflake-sqlalchemy` "
                    "to requirements to enable the Snowflake adapter"
                ) from exc
            account = self.credentials.extra.get("account")
            host = self.credentials.host or (
                f"{account}.snowflakecomputing.com" if account else None
            )
            if not host:
                raise AdapterError("Snowflake connection needs `account` or `host`")
            url = (
                f"snowflake://{self.credentials.username}:{self.credentials.password}"
                f"@{host}/{self.credentials.database or ''}"
                f"?warehouse={self.credentials.extra.get('warehouse', '')}"
                f"&role={self.credentials.extra.get('role', '')}"
            )
            self._engine_instance = create_engine(url, pool_pre_ping=True)
        return self._engine_instance

    def _lists_sql(self) -> dict[str, str]:
        return {
            "databases": "SHOW DATABASES",  # SHOW lacks bind params; wrapper handles
            "schemas": (
                "SELECT schema_name FROM information_schema.schemata "
                "WHERE catalog = :database ORDER BY schema_name"
            ),
            "tables": (
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = :schema ORDER BY table_name"
            ),
            "columns": (
                "SELECT column_name, data_type, is_nullable = 'YES' "
                "FROM information_schema.columns "
                "WHERE table_schema = :schema AND table_name = :table "
                "ORDER BY ordinal_position"
            ),
        }

    async def get_databases(self) -> list[str]:
        rows = await self._run_async("SHOW DATABASES")
        # SHOW DATABASES rows: created_on, name, ... — name is column index 1.
        return [r[1] for r in rows] if rows and len(rows[0]) > 1 else [r[0] for r in rows]

    async def get_schemas(self, database: str | None = None) -> list[str]:
        db = database or self.credentials.database
        rows = await self._run_async(
            self._lists_sql()["schemas"], {"database": db}
        )
        return [r[0] for r in rows]

    async def get_table_stats(self, table: str, schema: str | None = None) -> dict[str, Any]:
        """Row count from SNOWFLAKE.ACCOUNT_USAGE (eventual consistency) — fall
        back to a live COUNT(*) when the view is unavailable."""
        schema_part = schema or "PUBLIC"
        sql = (
            "SELECT row_count FROM SNOWFLAKE.ACCOUNT_USAGE.TABLES "
            "WHERE table_schema = :schema AND table_name = :table "
            "AND deleted IS NULL ORDER BY last_altered DESC LIMIT 1"
        )
        try:
            rows = await self._run_async(sql, {"schema": schema_part, "table": table})
            if rows:
                return {"table": table, "schema": schema_part, "rowCount": int(rows[0][0])}
        except Exception:  # noqa: BLE001 — ACCOUNT_USAGE needs enabling
            logger.info("ACCOUNT_USAGE stats unavailable for %s.%s", schema_part, table)
        return await super().get_table_stats(table, schema_part)
