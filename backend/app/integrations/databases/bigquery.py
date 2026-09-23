"""BigQuery adapter — google-cloud-bigquery when installed; clear error otherwise.

Auth is service-account JSON referenced via the secret manager:
    credentials.extra: {service_account_json: "<resolved secret material>"}
"""

from __future__ import annotations

from typing import Any

from app.core.logging import get_logger
from app.integrations.databases.base import (
    AdapterCredentials,
    AdapterError,
    DatabaseAdapter,
)

logger = get_logger("aiden.adapters.bigquery")


class BigQueryAdapter(DatabaseAdapter):
    provider_id = "bigquery"

    def __init__(self, credentials: AdapterCredentials) -> None:
        super().__init__(credentials)
        self._client: Any = None
        self._project: str | None = credentials.extra.get("projectId")

    def _get_client(self):
        if self._client is not None:
            return self._client
        try:
            from google.cloud import bigquery
            from google.oauth2 import service_account
        except ImportError as exc:
            raise AdapterError(
                "BigQuery driver not installed — add `google-cloud-bigquery` "
                "to requirements to enable the BigQuery adapter"
            ) from exc
        sa_json = self.credentials.extra.get("serviceAccountJson")
        project = self._project or self.credentials.extra.get("projectId")
        if not sa_json or not project:
            raise AdapterError("BigQuery needs serviceAccountJson + projectId")
        import json

        info = json.loads(sa_json) if isinstance(sa_json, str) else sa_json
        creds = service_account.Credentials.from_service_account_info(info)
        self._client = bigquery.Client(project=project, credentials=creds)
        return self._client

    def _engine(self):  # pragma: no cover - BigQuery bypasses the SQL engine path
        raise AdapterError("BigQuery uses its client API, not SQLAlchemy engines")

    async def _run_async(self, sql: str, params: dict | None = None) -> list[tuple]:
        import asyncio

        def _query() -> list[tuple]:
            client = self._get_client()
            job = client.query(sql)
            return [tuple(row.values()) for row in job.result()]

        return await asyncio.to_thread(_query)

    def _lists_sql(self) -> dict[str, str]:  # pragma: no cover - not used
        return {}

    async def get_databases(self) -> list[str]:
        def _list() -> list[str]:
            return [ds.dataset_id for ds in self._get_client().list_datasets()]

        import asyncio

        return await asyncio.to_thread(_list)

    async def get_schemas(self, database: str | None = None) -> list[str]:
        # BigQuery: dataset == schema
        return await self.get_databases()

    async def get_tables(self, schema: str | None = None) -> list[str]:
        dataset = schema or self.credentials.database

        def _list() -> list[str]:
            client = self._get_client()
            return [t.table_id for t in client.list_tables(dataset)]

        import asyncio

        return await asyncio.to_thread(_list)

    async def get_columns(self, table: str, schema: str | None = None) -> list[dict[str, Any]]:
        dataset = schema or self.credentials.database

        def _cols() -> list[dict[str, Any]]:
            client = self._get_client()
            tbl = client.get_table(f"{self._project}.{dataset}.{table}")
            return [
                {"name": f.name, "dataType": f.field_type, "nullable": f.mode != "REQUIRED"}
                for f in tbl.schema
            ]

        import asyncio

        return await asyncio.to_thread(_cols)

    async def execute_query(self, query: str, *, max_rows: int = 500) -> list[dict[str, Any]]:
        from app.integrations.databases.base import _DESTRUCTIVE_RE

        stripped = query.strip().rstrip(";")
        if _DESTRUCTIVE_RE.search(stripped):
            raise AdapterError("Destructive SQL is blocked in the integration gateway")

        def _run() -> list[dict[str, Any]]:
            client = self._get_client()
            job = client.query(stripped)
            rows = list(job.result(timeout=60))[:max_rows]
            return [dict(row) for row in rows]

        import asyncio

        try:
            return await asyncio.to_thread(_run)
        except Exception as exc:
            raise AdapterError(f"Query failed: {exc}") from exc
