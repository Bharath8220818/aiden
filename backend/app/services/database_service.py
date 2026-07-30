"""
Database Service — External database connections and schema discovery.

Uses lazy imports for asyncpg so the module loads cleanly even when
the PostgreSQL driver is not installed in the local dev environment.
"""

from __future__ import annotations

import logging
from typing import Dict, List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    import asyncpg

logger = logging.getLogger(__name__)

# Lazy import — asyncpg is only needed when actually connecting to Postgres
_asyncpg = None


def _get_asyncpg():
    global _asyncpg
    if _asyncpg is None:
        try:
            import asyncpg
            _asyncpg = asyncpg
        except ImportError:
            raise ImportError(
                "asyncpg is required to connect to PostgreSQL. "
                "Install it with: pip install asyncpg"
            )
    return _asyncpg


class ExternalDatabaseService:
    """Service for connecting to and querying external databases."""

    @staticmethod
    async def connect_postgres(
        host: str,
        port: int,
        database: str,
        user: str,
        password: str,
    ) -> Optional["asyncpg.Connection"]:
        """Connect to a PostgreSQL database."""
        asyncpg = _get_asyncpg()
        try:
            conn = await asyncpg.connect(
                host=host,
                port=port,
                database=database,
                user=user,
                password=password,
                timeout=10,
            )
            return conn
        except Exception as e:
            logger.error("Failed to connect to PostgreSQL: %s", e)
            return None

    @staticmethod
    async def get_schema(conn: "asyncpg.Connection", table: str = None) -> Dict:
        """Get schema information from a database."""
        schema_info = {}

        if table:
            query = """
                SELECT
                    column_name,
                    data_type,
                    is_nullable,
                    column_default
                FROM information_schema.columns
                WHERE table_name = $1
                ORDER BY ordinal_position
            """
            rows = await conn.fetch(query, table)
            schema_info[table] = [dict(row) for row in rows]
        else:
            tables_query = """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
            """
            tables = await conn.fetch(tables_query)

            for table_row in tables:
                table_name = table_row["table_name"]
                query = """
                    SELECT
                        column_name,
                        data_type,
                        is_nullable,
                        column_default
                    FROM information_schema.columns
                    WHERE table_name = $1
                    ORDER BY ordinal_position
                """
                rows = await conn.fetch(query, table_name)
                schema_info[table_name] = [dict(row) for row in rows]

        return schema_info

    @staticmethod
    async def sample_data(conn: "asyncpg.Connection", table: str, limit: int = 100) -> List[Dict]:
        """Get sample data from a table."""
        try:
            query = f"SELECT * FROM {table} LIMIT {limit}"
            rows = await conn.fetch(query)
            return [dict(row) for row in rows]
        except Exception as e:
            logger.error("Failed to fetch sample data: %s", e)
            return []

    @staticmethod
    async def test_connection(
        host: str, port: int, database: str, user: str, password: str
    ) -> bool:
        """Test a database connection."""
        asyncpg = _get_asyncpg()
        try:
            conn = await asyncpg.connect(
                host=host,
                port=port,
                database=database,
                user=user,
                password=password,
                timeout=5,
            )
            await conn.close()
            return True
        except Exception:
            return False
