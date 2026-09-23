"""Adapter registry — provider id → adapter class.

The single place that maps `connection_registry.provider_id` values to
adapter implementations. New warehouses register here; nothing else in the
platform changes.
"""

from __future__ import annotations

from app.integrations.databases.base import (
    AdapterCredentials,
    AdapterError,
    DatabaseAdapter,
)

# BigQuery imported lazily to keep import cost low; class is cheap to import.
from app.integrations.databases.bigquery import BigQueryAdapter
from app.integrations.databases.mysql import MySQLAdapter
from app.integrations.databases.postgresql import PostgresAdapter
from app.integrations.databases.snowflake import SnowflakeAdapter

_ADAPTERS: dict[str, type[DatabaseAdapter]] = {
    "prov-postgres": PostgresAdapter,
    "postgresql": PostgresAdapter,
    "postgres": PostgresAdapter,
    "prov-mysql": MySQLAdapter,
    "mysql": MySQLAdapter,
    "prov-snowflake": SnowflakeAdapter,
    "snowflake": SnowflakeAdapter,
    "prov-bigquery": BigQueryAdapter,
    "bigquery": BigQueryAdapter,
    # Redshift is PostgreSQL-wire-compatible; its adapter ships with the
    # warehouse extra (`redshift_connector`) and falls back to Postgres dialect.
    "prov-redshift": PostgresAdapter,
    "redshift": PostgresAdapter,
}


def adapter_for(provider_id: str) -> type[DatabaseAdapter]:
    """Resolve an adapter class; unknown providers raise AdapterError."""
    adapter = _ADAPTERS.get(provider_id)
    if adapter is None:
        raise AdapterError(f"No database adapter registered for provider '{provider_id}'")
    return adapter


def build_adapter(provider_id: str, credentials: AdapterCredentials) -> DatabaseAdapter:
    return adapter_for(provider_id)(credentials)


def registered_providers() -> list[str]:
    """Canonical provider ids with adapters (deduped, provider-prefixed form)."""
    return sorted({pid.removeprefix("prov-") for pid in _ADAPTERS})


__all__ = [
    "AdapterCredentials",
    "AdapterError",
    "DatabaseAdapter",
    "adapter_for",
    "build_adapter",
    "registered_providers",
]
