"""
PostgreSQL Connector v2 — Enhanced with Pydantic validation, retries, timeouts, and audit logging.

Wraps PostgreSQL operations via the Tool Gateway with full operational support.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from hashlib import sha256

from pydantic import BaseModel, Field

from app.tools.connector_base_v2 import (
    BaseConnector,
    ToolCategory,
    ToolStatus,
    ConnectorResult,
    ConnectorHealth,
    classify_mutation,
    mask_credentials,
)

logger = logging.getLogger(__name__)


# ── Pydantic Input Schemas ──────────────────────────────────────────

class SQLQueryParams(BaseModel):
    sql: str = Field(..., min_length=1, description="SQL query to execute")
    params: Optional[List[Any]] = Field(None, description="Query parameters")
    limit: int = Field(1000, ge=1, le=100000, description="Maximum rows returned")
    read_only: bool = Field(True, description="Whether this is a read-only query")


class DescribeTableParams(BaseModel):
    table_name: str = Field(..., min_length=1, description="Fully qualified table name (schema.table)")
    include_sample: bool = Field(False, description="Include sample rows")


# ── Connector ───────────────────────────────────────────────────────

class PostgresConnectorV2(BaseConnector):
    """Enhanced PostgreSQL connector with retries, validation, and audit logging."""

    name = "postgresql"
    display_name = "PostgreSQL"
    category = ToolCategory.DATABASE
    icon = "postgresql"
    description = "Query, manage, and monitor PostgreSQL databases"

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        cfg = config or {}
        self._host: str = cfg.get("host", "localhost")
        self._port: int = cfg.get("port", 5432)
        self._database: str = cfg.get("database", "postgres")
        self._user: str = cfg.get("user", cfg.get("username", "postgres"))
        self._password: str = cfg.get("password", "")
        self._conn = None
        self._capabilities = [
            "list_databases",
            "list_schemas",
            "list_tables",
            "describe_table",
            "get_table_sample",
            "execute_sql",
            "execute_readonly_sql",
            "get_database_stats",
            "get_table_stats",
            "get_active_queries",
            "get_replication_status",
            "check_table_sizes",
        ]

    def _get_connection(self):
        if self._conn is None:
            try:
                import psycopg2
                self._conn = psycopg2.connect(
                    host=self._host,
                    port=self._port,
                    dbname=self._database,
                    user=self._user,
                    password=self._password,
                    connect_timeout=self._config.timeout_seconds,
                )
                self._conn.autocommit = True
            except ImportError:
                logger.warning("psycopg2 not installed")
            except Exception as e:
                logger.error("PostgreSQL connection failed: %s", e)
        return self._conn

    def _execute_query(self, sql: str, params: tuple = (), fetch: bool = True):
        conn = self._get_connection()
        if not conn:
            raise ConnectionError("PostgreSQL not connected")
        cursor = conn.cursor()
        try:
            cursor.execute(sql, params)
            if fetch and cursor.description:
                columns = [d[0] for d in cursor.description]
                rows = cursor.fetchall()
                return {"columns": columns, "rows": [dict(zip(columns, row)) for row in rows]}
            return {"affected": cursor.rowcount}
        finally:
            cursor.close()

    # ── Public interface ────────────────────────────────────────────

    async def test(self) -> ConnectorResult:
        start = datetime.utcnow()
        action = "test"
        try:
            self._get_connection()
            if not self._conn:
                self._status = ToolStatus.DISCONNECTED
                return ConnectorResult(
                    success=False, error="psycopg2 not installed or connection failed",
                    tool_name=self.name, action=action,
                )
            result = self._execute_query("SELECT version()")
            self._status = ToolStatus.CONNECTED
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            self._record_audit(action, True, True, ms)
            return ConnectorResult(
                success=True,
                data={
                    "connected": True,
                    "version": result["rows"][0]["version"] if result.get("rows") else "unknown",
                    "host": self._host,
                    "port": self._port,
                    "database": self._database,
                },
                tool_name=self.name, action=action, read_only=True, execution_time_ms=ms,
            )
        except Exception as e:
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            self._status = ToolStatus.ERROR
            self._record_audit(action, True, False, ms, str(e))
            return ConnectorResult(
                success=False, error=str(e), tool_name=self.name, action=action,
            )

    async def health(self) -> ConnectorHealth:
        start = datetime.utcnow()
        try:
            result = self._execute_query(
                "SELECT 1 as alive, pg_database_size(current_database()) as db_size"
            )
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            data = result["rows"][0] if result.get("rows") else {}
            return ConnectorHealth(
                status="healthy",
                latency_ms=ms,
                details={
                    "database_size_bytes": data.get("db_size", 0),
                    "host": self._host,
                    "database": self._database,
                },
            )
        except Exception as e:
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            return ConnectorHealth(status="error", latency_ms=ms, details={"error": str(e)})

    async def list_resources(self, resource_type: str = "tables") -> ConnectorResult:
        start = datetime.utcnow()
        action = f"list_{resource_type}"
        try:
            data: List[Dict] = []

            if resource_type == "tables" or resource_type == "schemas":
                result = self._execute_query(
                    "SELECT schemaname, tablename, tableowner "
                    "FROM pg_catalog.pg_tables "
                    "WHERE schemaname NOT IN ('pg_catalog', 'information_schema') "
                    "ORDER BY schemaname, tablename"
                )
                data = result.get("rows", [])

            elif resource_type == "databases":
                result = self._execute_query(
                    "SELECT datname, pg_database_size(datname) as size_bytes "
                    "FROM pg_database WHERE datistemplate = false ORDER BY datname"
                )
                data = result.get("rows", [])

            elif resource_type == "views":
                result = self._execute_query(
                    "SELECT schemaname, viewname FROM pg_catalog.pg_views "
                    "WHERE schemaname NOT IN ('pg_catalog', 'information_schema')"
                )
                data = result.get("rows", [])

            ms = (datetime.utcnow() - start).total_seconds() * 1000
            self._record_audit(action, True, True, ms)
            return ConnectorResult(
                success=True, data=data, tool_name=self.name, action=action,
                read_only=True, execution_time_ms=ms,
            )
        except Exception as e:
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            self._record_audit(action, True, False, ms, str(e))
            return ConnectorResult(
                success=False, error=str(e), tool_name=self.name, action=action,
            )

    async def get_resource(self, resource_type: str, resource_id: str) -> ConnectorResult:
        start = datetime.utcnow()
        action = f"get_{resource_type}"
        try:
            data: Any = {}

            if resource_type == "table":
                result = self._execute_query(
                    "SELECT column_name, data_type, is_nullable, column_default, "
                    "character_maximum_length "
                    "FROM information_schema.columns "
                    "WHERE table_name = %s "
                    "ORDER BY ordinal_position",
                    (resource_id,),
                )
                data = {"table": resource_id, "columns": result.get("rows", [])}

            ms = (datetime.utcnow() - start).total_seconds() * 1000
            self._record_audit(action, True, True, ms)
            return ConnectorResult(
                success=True, data=data, tool_name=self.name, action=action,
                read_only=True, execution_time_ms=ms,
            )
        except Exception as e:
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            self._record_audit(action, True, False, ms, str(e))
            return ConnectorResult(
                success=False, error=str(e), tool_name=self.name, action=action,
            )

    async def execute(self, action: str, params: Dict[str, Any], dry_run: bool = False) -> ConnectorResult:
        start = datetime.utcnow()
        read_only = classify_mutation(action)

        try:
            if action == "execute_sql" or action == "execute_readonly_sql":
                validated = SQLQueryParams(**params)
                is_read_only = action == "execute_readonly_sql" or validated.read_only

                if dry_run:
                    ms = (datetime.utcnow() - start).total_seconds() * 1000
                    return ConnectorResult(
                        success=True,
                        data={"dry_run": True, "sql": validated.sql, "read_only": is_read_only},
                        tool_name=self.name, action=action, read_only=is_read_only, execution_time_ms=ms,
                    )

                result = self._execute_query(validated.sql, fetch=True)
                rows = result.get("rows", [])

                ms = (datetime.utcnow() - start).total_seconds() * 1000
                self._record_audit(action, is_read_only, True, ms)
                return ConnectorResult(
                    success=True,
                    data={
                        "columns": result.get("columns", []),
                        "rows": rows[:validated.limit],
                        "total_rows": len(rows),
                        "truncated": len(rows) > validated.limit,
                    },
                    tool_name=self.name, action=action, read_only=is_read_only, execution_time_ms=ms,
                )

            else:
                ms = (datetime.utcnow() - start).total_seconds() * 1000
                self._record_audit(action, read_only, False, ms, f"Unknown action: {action}")
                return ConnectorResult(
                    success=False, error=f"Unknown action: {action}",
                    tool_name=self.name, action=action,
                )
        except Exception as e:
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            self._record_audit(action, read_only, False, ms, str(e))
            return ConnectorResult(
                success=False, error=str(e), tool_name=self.name, action=action,
            )

    async def get_logs(self, resource_type: str, resource_id: str, limit: int = 50) -> ConnectorResult:
        start = datetime.utcnow()
        action = "pg_stat_activity"
        try:
            result = self._execute_query(
                "SELECT pid, usename, datname, client_addr, state, query, query_start "
                "FROM pg_stat_activity "
                "WHERE state IS NOT NULL "
                "ORDER BY query_start DESC "
                f"LIMIT {limit}"
            )
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            self._record_audit(action, True, True, ms)
            return ConnectorResult(
                success=True, data=result.get("rows", []), tool_name=self.name, action=action,
                read_only=True, execution_time_ms=ms,
            )
        except Exception as e:
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            self._record_audit(action, True, False, ms, str(e))
            return ConnectorResult(
                success=False, error=str(e), tool_name=self.name, action=action,
            )

    async def get_metrics(self) -> ConnectorResult:
        start = datetime.utcnow()
        action = "metrics"
        try:
            tables_result = await self.list_resources("tables")
            tables = tables_result.data or []
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            data = {
                "total_tables": len(tables),
                "status": self._status.value,
                "host": self._host,
                "database": self._database,
            }
            self._record_audit(action, True, True, ms)
            return ConnectorResult(
                success=True, data=data, tool_name=self.name, action=action,
                read_only=True, execution_time_ms=ms,
            )
        except Exception as e:
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            self._record_audit(action, True, False, ms, str(e))
            return ConnectorResult(
                success=False, error=str(e), tool_name=self.name, action=action,
            )


postgres_connector_v2 = PostgresConnectorV2()
