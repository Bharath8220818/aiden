"""Common schema utilities."""

from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class APIModel(BaseModel):
    """Base pydantic model with ORM + python-name population support."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class ListResponse(APIModel, Generic[T]):
    """Generic paginated list envelope."""

    items: list[T]
    total: int = 0
    skip: int = 0
    limit: int = 100


class ErrorDetail(APIModel):
    code: str
    message: str
    request_id: str | None = None


class ErrorResponse(APIModel):
    """Standard error envelope — matches the frontend error parsers."""

    error: ErrorDetail
    message: str


class HealthzResponse(APIModel):
    status: str


class ServiceCheck(APIModel):
    status: str = Field(description="ok | degraded | not_configured")
    detail: str | None = None


class FullHealthResponse(APIModel):
    status: str
    checks: dict[str, ServiceCheck]
