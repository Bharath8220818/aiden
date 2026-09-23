"""Generic CRUD repository base."""

from __future__ import annotations

import uuid
from collections.abc import Sequence
from typing import Any, Generic, TypeVar

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.base import Base

ModelT = TypeVar("ModelT", bound=Base)


def _coerce_uuid(value: Any) -> uuid.UUID:
    if isinstance(value, uuid.UUID):
        return value
    return uuid.UUID(str(value))


class BaseRepository(Generic[ModelT]):
    """Stateless repository bound to a session; methods mutate + flush only.

    Transaction commit/rollback is owned by the service/endpoint so that
    multi-step operations share a single transaction.
    """

    model: type[ModelT]

    def __init__(self, db: AsyncSession, model: type[ModelT] | None = None) -> None:
        self.db = db
        if model is not None:
            self.model = model

    async def get(self, obj_id: uuid.UUID | str) -> ModelT | None:
        if isinstance(obj_id, str):
            try:
                obj_id = _coerce_uuid(obj_id)
            except ValueError:
                return None
        return await self.db.get(self.model, obj_id)

    async def get_or_raise(self, obj_id: uuid.UUID | str) -> ModelT:
        obj = await self.get(obj_id)
        if obj is None:
            raise NotFoundError(f"{self.model.__name__} with id {obj_id} was not found")
        return obj

    async def list(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        order_by: Any | None = None,
        **filters: Any,
    ) -> Sequence[ModelT]:
        stmt = select(self.model)
        for key, value in filters.items():
            if value is not None:
                stmt = stmt.where(getattr(self.model, key) == value)
        stmt = stmt.offset(skip).limit(limit)
        if order_by is not None:
            stmt = stmt.order_by(order_by)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def count(self, **filters: Any) -> int:
        stmt = select(func.count()).select_from(self.model)
        for key, value in filters.items():
            if value is not None:
                stmt = stmt.where(getattr(self.model, key) == value)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none() or 0

    async def create(self, **values: Any) -> ModelT:
        obj = self.model(**values)
        self.db.add(obj)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    async def update(self, obj: ModelT, **values: Any) -> ModelT:
        for key, value in values.items():
            if value is not None and hasattr(obj, key):
                setattr(obj, key, value)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    async def delete(self, obj: ModelT) -> None:
        await self.db.delete(obj)
        await self.db.flush()

    async def delete_by_id(self, obj_id: uuid.UUID | str) -> None:
        obj = await self.get_or_raise(obj_id)
        await self.delete(obj)
