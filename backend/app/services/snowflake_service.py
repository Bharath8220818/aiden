"""
Snowflake Service — Snowflake data warehouse connector.

Provides a read-only interface for schema discovery and data extraction
from Snowflake. Uses the snowflake-connector-python library.
"""

import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


class SnowflakeService:
    """Connect to Snowflake for schema discovery and data operations."""

    def __init__(self, account: Optional[str] = None, user: Optional[str] = None, password: Optional[str] = None, warehouse: Optional[str] = None, database: Optional[str] = None, schema: Optional[str] = None):
        self.account = account
        self.user = user
        self.password = password
        self.warehouse = warehouse
        self.database = database
        self.schema = schema
        self._conn = None

    async def connect(self) -> bool:
        """Establish connection to Snowflake."""
        try:
            import snowflake.connector
            self._conn = snowflake.connector.connect(
                account=self.account,
                user=self.user,
                password=self.password,
                warehouse=self.warehouse,
                database=self.database,
                schema=self.schema,
            )
            return True
        except Exception as e:
            logger.error("Snowflake connection failed: %s", e)
            return False

    async def list_tables(self, schema: Optional[str] = None) -> List[str]:
        """List tables in the current or specified schema."""
        if not self._conn:
            return []
        cur = self._conn.cursor()
        try:
            target_schema = schema or self.schema
            cur.execute(f"SHOW TABLES IN SCHEMA {target_schema}" if target_schema else "SHOW TABLES")
            return [row[1] for row in cur.fetchall()]
        finally:
            cur.close()

    async def get_schema(self, table_name: str) -> List[Dict[str, Any]]:
        """Get column information for a table."""
        if not self._conn:
            return []
        cur = self._conn.cursor()
        try:
            cur.execute(f"DESCRIBE TABLE {table_name}")
            columns = []
            for row in cur.fetchall():
                columns.append({
                    "name": row[0],
                    "type": row[1],
                    "nullable": row[2] == "Y",
                    "default": row[3],
                    "primary_key": row[4] == "Y",
                })
            return columns
        finally:
            cur.close()

    async def close(self):
        """Close the Snowflake connection."""
        if self._conn:
            self._conn.close()
            self._conn = None
