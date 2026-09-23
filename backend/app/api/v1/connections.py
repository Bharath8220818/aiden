"""Connections endpoints — provider catalog + connection CRUD + health test."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import AuthContext, require_permission
from app.core.exceptions import ConflictError
from app.models.connection_registry import ConnectionRegistry
from app.repositories.connection_registry_repository import ConnectionRegistryRepository
from app.schemas.connections import (
    DataConnectionOut,
    ProviderOut,
    TestConnectionResultOut,
)
from app.services.registry_service import RegistryService, _mask_credentials

router = APIRouter(prefix="/connections", tags=["connections"])


@router.get("/providers", response_model=list[ProviderOut])
async def list_providers(
    ctx: AuthContext = Depends(require_permission("connection.read")),
    db: AsyncSession = Depends(get_db),
) -> list[ProviderOut]:
    return await RegistryService(db).connection_providers()


@router.get("", response_model=list[DataConnectionOut])
async def list_connections(
    ctx: AuthContext = Depends(require_permission("connection.read")),
    db: AsyncSession = Depends(get_db),
) -> list[DataConnectionOut]:
    return await RegistryService(db).connections()


@router.post("", response_model=DataConnectionOut, status_code=status.HTTP_201_CREATED)
async def save_connection(
    payload: dict,
    ctx: AuthContext = Depends(require_permission("connection.create")),
    db: AsyncSession = Depends(get_db),
) -> DataConnectionOut:
    """Create or update a connection (upsert by id). Secrets are stored as
    opaque vault references — never echoed back in plaintext."""
    service = RegistryService(db)
    conn_id = str(
        payload.get("id")
        or f"conn-{payload.get('providerId', 'custom')}-{abs(hash(payload.get('name', 'x'))) % 10000}"
    )
    existing = await ConnectionRegistryRepository(db).get(conn_id)
    values = dict(
        name=payload.get("name") or conn_id,
        provider_id=payload.get("providerId") or "prov-postgres",
        category=payload.get("category") or "database",
        environment=payload.get("environment") or "production",
        host=payload.get("host") or "localhost",
        port=payload.get("port"),
        database=payload.get("database"),
        auth_type=payload.get("authType") or "user_password",
        credentials=payload.get("credentials") or {},
        ssl_enabled=bool(payload.get("sslEnabled", True)),
    )
    if existing is not None:
        for key, value in values.items():
            setattr(existing, key, value)
        await db.commit()
    else:
        db.add(ConnectionRegistry(id=conn_id, **values))
        await db.commit()
    connections = {c.id: c for c in await service.connections()}
    out = connections.get(conn_id)
    if out is None:  # not in the deterministic view — reflect stored values
        out = DataConnectionOut(
            id=conn_id,
            name=values["name"],
            providerId=values["provider_id"],
            providerName=values["provider_id"],
            category=values["category"],
            environment=values["environment"],
            status="connected",
            host=values["host"],
            port=values["port"],
            database=values["database"],
            authType=values["auth_type"],
            credentials=_mask_credentials(values["credentials"]),
            sslEnabled=values["ssl_enabled"],
            createdAt=payload.get("createdAt") or "",
            lastCheckedAt=payload.get("lastCheckedAt") or "",
            latencyMs=None,
            stats={"pipelinesUsing": 0, "tablesIntrospected": 0, "monthlyQueryCount": 0},
            lastError=None,
        )
    return out


@router.delete("/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_connection(
    connection_id: str,
    ctx: AuthContext = Depends(require_permission("connection.delete")),
    db: AsyncSession = Depends(get_db),
) -> Response:
    existing = await ConnectionRegistryRepository(db).get(connection_id)
    if existing is not None:
        await ConnectionRegistryRepository(db).delete(existing)
        await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/test", response_model=TestConnectionResultOut)
async def test_connection(
    payload: dict,
    ctx: AuthContext = Depends(require_permission("connection.read")),
    db: AsyncSession = Depends(get_db),
) -> TestConnectionResultOut:
    return await RegistryService(db).test_connection(payload)


@router.post("/{connection_id}/introspect")
async def introspect_connection(
    connection_id: str,
    payload: dict | None = None,
    ctx: AuthContext = Depends(require_permission("connection.read")),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Live catalog probe through the database adapter (spec §2/§14).

    "Show me the tables in my Snowflake analytics database" lands here: the
    platform resolves the connection's secret material server-side, builds
    the adapter, and returns metadata only — credentials never reach the
    frontend or the AI.
    """
    body = payload or {}
    connection = await ConnectionRegistryRepository(db).get(connection_id)
    if connection is None:
        from app.core.exceptions import NotFoundError

        raise NotFoundError("Connection was not found")

    from app.integrations.databases.base import AdapterError
    from app.integrations.databases.registry import build_adapter
    from app.services.secret_service import SecretService

    try:
        adapter = build_adapter(connection.provider_id, await SecretService(db).resolve(connection))
    except AdapterError as exc:
        raise ConflictError(str(exc), code="ADAPTER_UNAVAILABLE") from exc

    try:
        health = await adapter.test_connection()
        result: dict = {
            "connectionId": connection_id,
            "provider": connection.provider_id,
            "latencyMs": health["latencyMs"],
        }
        scope = str(body.get("scope") or "tables")
        schema = body.get("schema") or connection.database
        if scope == "databases":
            result["databases"] = await adapter.get_databases()
        elif scope == "schemas":
            result["schemas"] = await adapter.get_schemas(body.get("database"))
        elif scope == "columns":
            table = body.get("table")
            if not table:
                from app.core.exceptions import ValidationError

                raise ValidationError("`table` is required for scope=columns")
            result["table"] = table
            result["columns"] = await adapter.get_columns(table, schema)
        else:
            result["schema"] = schema
            result["tables"] = await adapter.get_tables(schema)
        return result
    except AdapterError as exc:
        raise ConflictError(str(exc), code="INTROSPECTION_FAILED") from exc
