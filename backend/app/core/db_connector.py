"""
Database Connector — real database read/write for pipeline execution.

Provides a unified async interface that auto-detects the database type from
the connection string prefix:

  postgresql://...       → asyncpg (connection pooling, streaming)
  sqlite:///...          → aiosqlite
  bigquery://project.ds  → google-cloud-bigquery with Storage API streaming

Usage:
    async with DatabaseConnector(connection_string) as db:
        schema = await db.get_schema("users")
        async for batch in db.stream_table("users", batch_size=1000):
            ...  # process each chunk of rows
        await db.write_table("analytics_summary", rows, if_exists="replace")
"""

import asyncio
import logging
from typing import Any, AsyncGenerator, Optional

logger = logging.getLogger(__name__)


class DatabaseConnector:
    """Unified async database connector supporting Postgres, SQLite, and BigQuery."""

    def __init__(self, connection_string: str, pool_size: int = 5):
        self._connection_string = connection_string
        self._pool_size = pool_size
        self._db_type = self._detect_db_type(connection_string)
        # Postgres
        self._pool = None
        # SQLite
        self._sqlite_conn = None
        # BigQuery
        self._bq_client = None
        self._bq_storage_client = None
        self._bq_project = None
        self._bq_dataset = None
        self._connected = False
        # Parse BigQuery DSN eagerly (cheap string ops, no network calls)
        if self._db_type == "bigquery":
            self._bq_project, self._bq_dataset = self._parse_bigquery_dsn()

    # ── Public helpers ────────────────────────────────────────────────────

    @staticmethod
    def _detect_db_type(dsn: str) -> str:
        """Return 'postgres', 'sqlite', or 'bigquery' based on the DSN prefix."""
        if not dsn or not dsn.strip():
            logger.warning(
                "Empty connection_string — defaulting to SQLite (local/dev). "
                "Set a connection_string for production use."
            )
            return "sqlite"
        prefix = dsn.split("://")[0].lower()
        if prefix.startswith("postgres") or prefix.startswith("pg"):
            return "postgres"
        if prefix.startswith("sqlite"):
            return "sqlite"
        if prefix.startswith("bigquery") or prefix.startswith("bq"):
            return "bigquery"
        logger.warning(
            "Unknown DSN prefix %r — defaulting to postgres. "
            "Expected postgresql://, sqlite://, or bigquery://",
            prefix,
        )
        return "postgres"

    @property
    def db_type(self) -> str:
        return self._db_type

    @property
    def is_connected(self) -> bool:
        return self._connected

    # ── BigQuery helpers ─────────────────────────────────────────────────

    def _parse_bigquery_dsn(self) -> tuple[str, str]:
        """Parse ``bigquery://project.dataset`` or ``bigquery://project/dataset``.

        Returns:
            (project_id, dataset_id)

        Raises:
            ValueError: if the DSN is malformed (missing project).
        """
        raw = self._connection_string.split("://", 1)[1]
        if not raw or not raw.strip():
            raise ValueError(
                "Malformed BigQuery DSN: expected bigquery://<project>.<dataset>, "
                f"got {self._connection_string!r}"
            )
        # Support both dot and slash delimiters
        if "/" in raw:
            parts = raw.split("/", 1)
        else:
            parts = raw.split(".", 1)
        project = parts[0].strip()
        dataset = parts[1].strip() if len(parts) > 1 else "default"
        if not project:
            raise ValueError(
                "Malformed BigQuery DSN: project_id is empty in "
                f"{self._connection_string!r}"
            )
        return project, dataset

    def _bq_table_ref(self, table: str) -> str:
        """Fully-qualified BigQuery table reference ``project.dataset.table``."""
        return f"{self._bq_project}.{self._bq_dataset}.{table}"

    async def _stream_bigquery_storage(
        self,
        table: str,
        columns: Optional[list[str]],
        batch_size: int,
    ) -> AsyncGenerator[list[dict[str, Any]], None]:
        """Stream rows from BigQuery via the Storage API (Arrow format).

        Uses ``BigQueryReadAsyncClient`` with a single read stream.
        If this method yields nothing, the caller should fall back to the query API.

        Note: The Arrow schema is sent only on the first ``ReadRowsResponse``.
        Subsequent responses omit ``serialized_schema``, so we cache it after
        the first batch.
        """
        assert self._bq_storage_client is not None
        import pyarrow as pa
        from google.cloud.bigquery_storage_v1 import types as bq_storage_types

        table_ref = (
            f"projects/{self._bq_project}"
            f"/datasets/{self._bq_dataset}"
            f"/tables/{table}"
        )

        read_session = bq_storage_types.ReadSession()
        read_session.table = table_ref
        read_session.data_format = bq_storage_types.DataFormat.ARROW
        if columns:
            read_session.read_options.selected_fields = columns

        logger.info(
            "BigQuery Storage API: creating read session for %s",
            table_ref,
        )

        session = await self._bq_storage_client.create_read_session(
            parent=f"projects/{self._bq_project}",
            read_session=read_session,
            max_stream_count=1,
        )

        if not session.streams:
            logger.warning(
                "BigQuery Storage API returned no streams for %s. "
                "Falling back to query API.",
                table_ref,
            )
            return

        stream = session.streams[0]
        logger.info(
            "Reading from BigQuery stream %s (batch=%d)",
            stream.name, batch_size,
        )

        reader = await self._bq_storage_client.read_rows(stream.name)

        # Cache the Arrow schema from the first response (subsequent responses
        # omit serialized_schema)
        arrow_schema: Any = None
        batch: list[dict[str, Any]] = []
        async for response in reader.rows():
            arrow_batch = response.arrow_record_batch
            if arrow_batch is None or not arrow_batch.serialized_record_batch:
                continue
            # Read schema from the first response, then cache it
            if arrow_schema is None and arrow_batch.serialized_schema:
                arrow_schema = pa.ipc.read_schema(arrow_batch.serialized_schema)
            if arrow_schema is None:
                logger.warning(
                    "BigQuery Storage: no Arrow schema available, skipping batch"
                )
                continue
            record_batch = pa.RecordBatch.from_serialized(
                arrow_batch.serialized_record_batch, arrow_schema,
            )
            for row in record_batch.to_pylist():
                batch.append(row)
                if len(batch) >= batch_size:
                    yield batch
                    batch = []
        if batch:
            yield batch

    # ── Lifecycle ─────────────────────────────────────────────────────────

    async def connect(self) -> None:
        """Open the connection pool or client."""
        if self._connected:
            return
        try:
            if self._db_type == "postgres":
                import asyncpg
                self._pool = await asyncpg.create_pool(
                    dsn=self._connection_string,
                    min_size=1,
                    max_size=self._pool_size,
                    command_timeout=30,
                )
                logger.info(
                    "Postgres pool created (min=1, max=%d): %s",
                    self._pool_size,
                    self._connection_string.split("@")[0][:40] + "...",
                )
            elif self._db_type == "bigquery":
                from google.cloud import bigquery
                self._bq_project, self._bq_dataset = self._parse_bigquery_dsn()
                self._bq_client = await asyncio.to_thread(
                    bigquery.Client, project=self._bq_project,
                )
                # Try Storage API client for efficient streaming reads
                try:
                    from google.cloud.bigquery_storage_v1 import BigQueryReadAsyncClient
                    self._bq_storage_client = BigQueryReadAsyncClient()
                    logger.info("BigQuery Storage API available for streaming reads")
                except (ImportError, Exception) as exc:
                    self._bq_storage_client = None
                    logger.info(
                        "BigQuery Storage API unavailable (%s). "
                        "Falling back to query API for reads.",
                        exc,
                    )
                logger.info(
                    "BigQuery client initialised: project=%s, dataset=%s",
                    self._bq_project, self._bq_dataset,
                )
            else:
                import aiosqlite
                path = self._connection_string.replace("sqlite:///", "")
                self._sqlite_conn = await aiosqlite.connect(path)
                self._sqlite_conn.row_factory = aiosqlite.Row
                logger.info("SQLite connection opened: %s", path)
            self._connected = True
        except Exception as exc:
            logger.error("Failed to connect to %s database: %s", self._db_type, exc)
            raise

    async def close(self) -> None:
        """Close the pool, client, or connection."""
        if not self._connected:
            return
        try:
            if self._db_type == "postgres" and self._pool:
                await self._pool.close()
                logger.info("Postgres pool closed")
            elif self._db_type == "bigquery":
                self._bq_client = None
                self._bq_storage_client = None
                logger.info("BigQuery client released")
            elif self._db_type == "sqlite" and self._sqlite_conn:
                await self._sqlite_conn.close()
                logger.info("SQLite connection closed")
        except Exception as exc:
            logger.warning("Error closing database: %s", exc)
        finally:
            self._connected = False
            self._pool = None
            self._sqlite_conn = None
            self._bq_client = None
            self._bq_storage_client = None

    async def __aenter__(self) -> "DatabaseConnector":
        await self.connect()
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self.close()

    # ── Schema discovery ──────────────────────────────────────────────────

    async def get_schema(
        self,
        table: str,
        schema: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        """Return column metadata (name, type, nullable) for a table."""
        if self._db_type == "postgres":
            return await self._get_pg_schema(table, schema)
        elif self._db_type == "bigquery":
            return await self._get_bq_schema(table)
        else:
            return await self._get_sqlite_schema(table)

    async def _get_pg_schema(
        self, table: str, schema_name: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        assert self._pool is not None
        schema_name = schema_name or "public"
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = $1 AND table_name = $2
                ORDER BY ordinal_position
                """,
                schema_name,
                table,
            )
        return [
            {
                "name": r["column_name"],
                "type": r["data_type"],
                "nullable": r["is_nullable"] == "YES",
            }
            for r in rows
        ]

    async def _get_bq_schema(self, table: str) -> list[dict[str, Any]]:
        """Fetch BigQuery table schema via the REST API."""
        assert self._bq_client is not None
        table_ref = self._bq_table_ref(table)
        bq_table = await asyncio.to_thread(self._bq_client.get_table, table_ref)
        return [
            {
                "name": field.name,
                "type": field.field_type,
                "nullable": field.is_nullable,
                "mode": field.mode,
                "description": field.description or "",
            }
            for field in bq_table.schema
        ]

    async def _get_sqlite_schema(self, table: str) -> list[dict[str, Any]]:
        assert self._sqlite_conn is not None
        cursor = await self._sqlite_conn.execute(
            "SELECT name, type, `notnull` FROM pragma_table_info(?)", (table,)
        )
        rows = await cursor.fetchall()
        await cursor.close()
        return [
            {
                "name": r[0],
                "type": r[1],
                "nullable": not r[2],
            }
            for r in rows
        ]

    # ── Streaming read ────────────────────────────────────────────────────

    async def stream_table(
        self,
        table: str,
        schema: Optional[str] = None,
        columns: Optional[list[str]] = None,
        where: Optional[str] = None,
        order_by: Optional[str] = None,
        batch_size: int = 5000,
    ) -> AsyncGenerator[list[dict[str, Any]], None]:
        """Stream rows from a table in batches, yielding lists of dicts.

        BigQuery uses the Storage API (``BigQueryReadAsyncClient`` with Arrow
        format) when available, with automatic fallback to the query API.
        """
        cols = ", ".join(columns) if columns else "*"

        # ── BigQuery: Storage API preferred, query API fallback ──────────
        if self._db_type == "bigquery":
            assert self._bq_client is not None
            assert self._bq_project and self._bq_dataset

            # Storage API path (efficient, bypasses query engine)
            if self._bq_storage_client is not None:
                async for batch in self._stream_bigquery_storage(
                    table, columns, batch_size,
                ):
                    yield batch
                return

            # Fallback: query API with Arrow batches
            table_ref = self._bq_table_ref(table)
            bq_query = f"SELECT {cols} FROM `{table_ref}`"
            if where:
                bq_query += f" WHERE {where}"
            if order_by:
                bq_query += f" ORDER BY {order_by}"

            logger.info(
                "BigQuery streaming (query API, batch=%d): %s",
                batch_size, bq_query[:200],
            )

            query_job = await asyncio.to_thread(self._bq_client.query, bq_query)
            for arrow_batch in query_job.result().to_arrow_iterable():
                rows_dicts = arrow_batch.to_pylist()
                for start in range(0, len(rows_dicts), batch_size):
                    yield rows_dicts[start : start + batch_size]
            return

        # ── Postgres / SQLite ────────────────────────────────────────────
        full_table = f'"{schema}"."{table}"' if schema and self._db_type == "postgres" else f'"{table}"'
        query = f"SELECT {cols} FROM {full_table}"
        if where:
            query += f" WHERE {where}"
        if order_by:
            query += f" ORDER BY {order_by}"

        logger.info("Streaming query (batch=%d): %s", batch_size, query[:150])

        if self._db_type == "postgres":
            assert self._pool is not None
            async with self._pool.acquire() as conn:
                async with conn.transaction():
                    batch: list[dict[str, Any]] = []
                    async for record in conn.cursor(query, prefetch=batch_size):
                        batch.append(dict(record))
                        if len(batch) >= batch_size:
                            yield batch
                            batch = []
                    if batch:
                        yield batch
        else:
            assert self._sqlite_conn is not None
            cursor = await self._sqlite_conn.execute(query)
            batch: list[dict[str, Any]] = []
            columns_described = [d[0] for d in cursor.description]
            async for row in cursor:
                batch.append(dict(zip(columns_described, row)))
                if len(batch) >= batch_size:
                    yield batch
                    batch = []
            if batch:
                yield batch
            await cursor.close()

    async def execute_query(
        self,
        query: str,
        params: Optional[list[Any]] = None,
    ) -> list[dict[str, Any]]:
        """Execute an arbitrary SQL query and return all rows."""
        if self._db_type == "bigquery":
            assert self._bq_client is not None
            query_job = await asyncio.to_thread(self._bq_client.query, query)
            rows = await asyncio.to_thread(query_job.result)
            return [dict(row.items()) for row in rows]
        elif self._db_type == "postgres":
            assert self._pool is not None
            async with self._pool.acquire() as conn:
                rows = await conn.fetch(query, *(params or []))
            return [dict(r) for r in rows]
        else:
            assert self._sqlite_conn is not None
            cursor = await self._sqlite_conn.execute(query, params or [])
            cols = [d[0] for d in cursor.description] if cursor.description else []
            rows = await cursor.fetchall()
            await cursor.close()
            return [dict(zip(cols, r)) for r in rows]

    async def count_rows(
        self,
        table: str,
        schema: Optional[str] = None,
        where: Optional[str] = None,
    ) -> int:
        """Return the number of rows in a table (optionally filtered)."""
        if self._db_type == "bigquery":
            table_ref = self._bq_table_ref(table)
            query = f"SELECT COUNT(*) as cnt FROM `{table_ref}`"
            if where:
                query += f" WHERE {where}"
            result = await self.execute_query(query)
        else:
            full_table = f'"{schema}"."{table}"' if schema and self._db_type == "postgres" else f'"{table}"'
            query = f"SELECT COUNT(*) as cnt FROM {full_table}"
            if where:
                query += f" WHERE {where}"
            result = await self.execute_query(query)
        return result[0]["cnt"] if result else 0

    # ── Write (batch insert) ──────────────────────────────────────────────

    async def write_table(
        self,
        table: str,
        rows: list[dict[str, Any]],
        schema: Optional[str] = None,
        if_exists: str = "append",
        batch_size: int = 1000,
    ) -> int:
        """Insert rows into a table, returning the count of inserted rows.

        Args:
            table: Target table name.
            rows: List of dicts (column → value) to insert.
            schema: Schema name (Postgres only; for BigQuery use dataset in DSN).
            if_exists: ``"append"`` (add rows), ``"replace"`` (DELETE + INSERT or
                       overwrite for BigQuery using ``WRITE_TRUNCATE``).
            batch_size: Rows per insert chunk.
        """
        if not rows:
            return 0

        # ── BigQuery path ────────────────────────────────────────────────
        if self._db_type == "bigquery":
            assert self._bq_client is not None
            table_ref = self._bq_table_ref(table)

            if if_exists == "replace":
                from google.cloud.bigquery import LoadJobConfig, WriteDisposition
                bq_table = await asyncio.to_thread(self._bq_client.get_table, table_ref)
                schema_fields = bq_table.schema
                job_config = LoadJobConfig(
                    write_disposition=WriteDisposition.WRITE_TRUNCATE,
                    schema=schema_fields,
                    source_format="NEWLINE_DELIMITED_JSON",
                )
                load_job = await asyncio.to_thread(
                    self._bq_client.load_table_from_json,
                    rows, table_ref, job_config=job_config,
                )
                await asyncio.to_thread(load_job.result)
                logger.info(
                    "BigQuery table %s replaced (%d rows)", table_ref, len(rows),
                )
                return len(rows)

            # Append via insert_rows_json
            inserted = 0
            for start in range(0, len(rows), batch_size):
                batch = rows[start : start + batch_size]
                errors = await asyncio.to_thread(
                    self._bq_client.insert_rows_json, table_ref, batch,
                )
                if errors:
                    logger.warning(
                        "BigQuery insert errors on %s: %s", table_ref, errors[:3],
                    )
                else:
                    inserted += len(batch)
            return inserted

        # ── Postgres / SQLite path ────────────────────────────────────────
        full_table = f'"{schema}"."{table}"' if schema and self._db_type == "postgres" else f'"{table}"'
        columns = list(rows[0].keys())
        col_list = ", ".join(f'"{c}"' for c in columns)
        placeholders_pg = ", ".join(f"${i+1}" for i in range(len(columns)))
        placeholders_sqlite = ", ".join("?" for _ in range(len(columns)))

        if self._db_type == "postgres":
            assert self._pool is not None
            async with self._pool.acquire() as conn:
                if if_exists == "replace":
                    await conn.execute(f"DELETE FROM {full_table}")
                inserted = 0
                for start in range(0, len(rows), batch_size):
                    batch = rows[start : start + batch_size]
                    args: list[list[Any]] = []
                    for row in batch:
                        args.append([row.get(c) for c in columns])
                    await conn.executemany(
                        f"INSERT INTO {full_table} ({col_list}) VALUES ({placeholders_pg})",
                        args,
                    )
                    inserted += len(batch)
                return inserted
        else:
            assert self._sqlite_conn is not None
            if if_exists == "replace":
                await self._sqlite_conn.execute(f"DELETE FROM {full_table}")
            inserted = 0
            for start in range(0, len(rows), batch_size):
                batch = rows[start : start + batch_size]
                await self._sqlite_conn.executemany(
                    f"INSERT INTO {full_table} ({col_list}) VALUES ({placeholders_sqlite})",
                    [[row.get(c) for c in columns] for row in batch],
                )
                inserted += len(batch)
            await self._sqlite_conn.commit()
            return inserted

    # ── Utility ───────────────────────────────────────────────────────────

    async def list_tables(
        self,
        schema: Optional[str] = None,
    ) -> list[str]:
        """Return the list of table names in the database."""
        if self._db_type == "postgres":
            assert self._pool is not None
            async with self._pool.acquire() as conn:
                rows = await conn.fetch(
                    "SELECT table_name FROM information_schema.tables "
                    "WHERE table_schema = $1 AND table_type = 'BASE TABLE'",
                    schema or "public",
                )
            return [r["table_name"] for r in rows]
        elif self._db_type == "bigquery":
            assert self._bq_client is not None
            tables = await asyncio.to_thread(
                self._bq_client.list_tables,
                f"{self._bq_project}.{self._bq_dataset}",
            )
            return [t.table_id for t in tables]
        else:
            assert self._sqlite_conn is not None
            cursor = await self._sqlite_conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
            )
            rows = await cursor.fetchall()
            await cursor.close()
            return [r[0] for r in rows]
