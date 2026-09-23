"""Repository for the ConnectionRegistry model."""

from __future__ import annotations

from app.models.connection_registry import ConnectionRegistry
from app.repositories.base import BaseRepository


class ConnectionRegistryRepository(BaseRepository[ConnectionRegistry]):
    model = ConnectionRegistry

    async def list_ordered(self) -> list[ConnectionRegistry]:
        from sqlalchemy import select

        result = await self.db.execute(select(ConnectionRegistry).order_by(ConnectionRegistry.created_at))
        return list(result.scalars().all())
