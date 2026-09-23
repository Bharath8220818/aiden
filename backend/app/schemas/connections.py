"""Connection schemas — mirrors `frontend/src/features/connections/types.ts`."""

from __future__ import annotations

from typing import Any

from pydantic import Field

from app.schemas.common import APIModel


class ProviderFieldOut(APIModel):
    key: str
    label: str
    type: str
    placeholder: str | None = None
    required: bool = False
    options: list[str] | None = None
    helper: str | None = None


class ProviderOut(APIModel):
    id: str
    name: str
    category: str
    technology: str
    description: str
    authTypes: list[str]
    defaultPort: int | None = None
    fields: list[ProviderFieldOut] = Field(default_factory=list)


class ConnectionStatsOut(APIModel):
    pipelinesUsing: int
    tablesIntrospected: int
    monthlyQueryCount: int


class DataConnectionOut(APIModel):
    id: str
    name: str
    providerId: str
    providerName: str
    category: str
    environment: str
    status: str
    host: str
    port: int | None = None
    database: str | None = None
    authType: str
    credentials: dict[str, Any] = Field(default_factory=dict)
    sslEnabled: bool
    createdAt: str
    lastCheckedAt: str
    latencyMs: int | None = None
    stats: ConnectionStatsOut
    lastError: str | None = None


class TestConnectionResultOut(APIModel):
    success: bool
    steps: list[dict]
    latencyMs: int
    testedAt: str
