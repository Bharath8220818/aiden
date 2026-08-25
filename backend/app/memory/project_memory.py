"""
Project Memory v2 — PostgreSQL-backed persistent project state.

Stores long-lived project data that agents need to reason about:
- Architecture graphs (nodes, edges, zones)
- Connections (tool configs, status)
- Pipeline history (runs, results)
- Preferences (user/project settings)
- Schema snapshots (table structures over time)
- Incidents (past failures and resolutions)

Each entry is scoped to a project_id and has a category/type for retrieval.
"""

import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from app.config import settings

logger = logging.getLogger(__name__)


class ProjectMemory:
    """
    Persistent project-scoped memory backed by PostgreSQL.

    Uses JSONB columns for flexible schema storage.
    Falls back to in-memory when database is unavailable.
    """

    def __init__(self):
        self._engine = None
        self._fallback: Dict[str, List[Dict]] = {}
        self._init_db()

    def _init_db(self):
        """Initialize database connection and ensure tables exist."""
        try:
            import sqlalchemy
            from sqlalchemy import text

            # Use synchronous engine for memory operations
            url = settings.DATABASE_URL
            if url.startswith("postgresql+asyncpg"):
                url = url.replace("postgresql+asyncpg", "postgresql")
            elif url.startswith("sqlite+aiosqlite"):
                url = url.replace("sqlite+aiosqlite", "sqlite")

            self._engine = sqlalchemy.create_engine(url, pool_pre_ping=True)

            # Create project_memory table if it doesn't exist
            with self._engine.connect() as conn:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS project_memory (
                        id SERIAL PRIMARY KEY,
                        project_id VARCHAR(128) NOT NULL,
                        category VARCHAR(64) NOT NULL,
                        entry_type VARCHAR(64) NOT NULL DEFAULT 'generic',
                        key VARCHAR(256) NOT NULL,
                        value JSONB NOT NULL DEFAULT '{}',
                        metadata JSONB NOT NULL DEFAULT '{}',
                        created_at TIMESTAMP DEFAULT NOW(),
                        updated_at TIMESTAMP DEFAULT NOW(),
                        UNIQUE(project_id, category, key)
                    )
                """))
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_pm_project_category
                    ON project_memory(project_id, category)
                """))
                conn.commit()
            logger.info("ProjectMemory: Database initialized")
        except Exception as e:
            logger.warning(f"ProjectMemory: Database init failed ({e}), using in-memory fallback")
            self._engine = None

    async def store(
        self,
        project_id: str,
        category: str,
        key: str,
        value: Dict[str, Any],
        entry_type: str = "generic",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Store a memory entry for a project."""
        now = datetime.utcnow().isoformat()
        entry = {
            "category": category,
            "entry_type": entry_type,
            "key": key,
            "value": value,
            "metadata": metadata or {},
            "created_at": now,
            "updated_at": now,
        }

        if self._engine:
            try:
                from sqlalchemy import text
                with self._engine.connect() as conn:
                    conn.execute(text("""
                        INSERT INTO project_memory (project_id, category, entry_type, key, value, metadata, updated_at)
                        VALUES (:pid, :cat, :et, :key, :val::jsonb, :meta::jsonb, :updated)
                        ON CONFLICT (project_id, category, key)
                        DO UPDATE SET value = :val::jsonb, metadata = :meta::jsonb, updated_at = :updated
                    """), {
                        "pid": project_id, "cat": category, "et": entry_type,
                        "key": key, "val": json.dumps(value), "meta": json.dumps(metadata or {}),
                        "updated": now,
                    })
                    conn.commit()
                return
            except Exception as e:
                logger.warning(f"ProjectMemory: DB write failed ({e}), using fallback")

        # In-memory fallback
        fkey = f"{project_id}:{category}"
        if fkey not in self._fallback:
            self._fallback[fkey] = []
        # Update or append
        for i, existing in enumerate(self._fallback[fkey]):
            if existing["key"] == key:
                self._fallback[fkey][i] = entry
                return
        self._fallback[fkey].append(entry)

    async def retrieve(
        self,
        project_id: str,
        category: str,
        key: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Retrieve memory entries for a project and category."""
        if self._engine:
            try:
                from sqlalchemy import text
                with self._engine.connect() as conn:
                    if key:
                        result = conn.execute(text("""
                            SELECT key, value, metadata, entry_type, created_at, updated_at
                            FROM project_memory
                            WHERE project_id = :pid AND category = :cat AND key = :key
                        """), {"pid": project_id, "cat": category, "key": key})
                    else:
                        result = conn.execute(text("""
                            SELECT key, value, metadata, entry_type, created_at, updated_at
                            FROM project_memory
                            WHERE project_id = :pid AND category = :cat
                            ORDER BY updated_at DESC
                            LIMIT :limit
                        """), {"pid": project_id, "cat": category, "limit": limit})

                    rows = result.fetchall()
                    return [
                        {
                            "key": row[0],
                            "value": row[1] if isinstance(row[1], dict) else json.loads(row[1]) if row[1] else {},
                            "metadata": row[2] if isinstance(row[2], dict) else json.loads(row[2]) if row[2] else {},
                            "entry_type": row[3],
                            "created_at": str(row[4]),
                            "updated_at": str(row[5]),
                        }
                        for row in rows
                    ]
            except Exception as e:
                logger.warning(f"ProjectMemory: DB read failed ({e}), using fallback")

        # In-memory fallback
        fkey = f"{project_id}:{category}"
        entries = self._fallback.get(fkey, [])
        if key:
            entries = [e for e in entries if e["key"] == key]
        return entries[-limit:]

    async def store_architecture(
        self,
        project_id: str,
        arch_id: str,
        name: str,
        nodes: List[Dict],
        edges: List[Dict],
        zones: Optional[List[Dict]] = None,
        metadata: Optional[Dict] = None,
    ) -> None:
        """Store an architecture graph."""
        await self.store(
            project_id=project_id,
            category="architecture",
            key=arch_id,
            entry_type="architecture_graph",
            value={
                "name": name,
                "nodes": nodes,
                "edges": edges,
                "zones": zones or [],
                "node_count": len(nodes),
                "edge_count": len(edges),
            },
            metadata=metadata or {},
        )

    async def get_architectures(self, project_id: str) -> List[Dict]:
        """Get all architectures for a project."""
        return await self.retrieve(project_id, "architecture")

    async def store_incident(
        self,
        project_id: str,
        incident_id: str,
        title: str,
        severity: str,
        root_cause: Optional[str] = None,
        resolution: Optional[str] = None,
        affected_components: Optional[List[str]] = None,
    ) -> None:
        """Store a resolved incident for future reference."""
        await self.store(
            project_id=project_id,
            category="incidents",
            key=incident_id,
            entry_type="incident",
            value={
                "title": title,
                "severity": severity,
                "root_cause": root_cause,
                "resolution": resolution,
                "affected_components": affected_components or [],
            },
        )

    async def get_similar_incidents(
        self,
        project_id: str,
        keywords: List[str],
        limit: int = 5,
    ) -> List[Dict]:
        """Find incidents matching keywords for root cause analysis."""
        incidents = await self.retrieve(project_id, "incidents", limit=100)
        scored = []
        for inc in incidents:
            value = inc.get("value", {})
            text = f"{value.get('title', '')} {value.get('root_cause', '')} {' '.join(value.get('affected_components', []))}".lower()
            score = sum(1 for kw in keywords if kw.lower() in text)
            if score > 0:
                scored.append((score, inc))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [inc for _, inc in scored[:limit]]

    async def store_preference(
        self,
        project_id: str,
        key: str,
        value: Any,
    ) -> None:
        """Store a project/user preference."""
        await self.store(
            project_id=project_id,
            category="preferences",
            key=key,
            entry_type="preference",
            value={"value": value},
        )

    async def get_preference(self, project_id: str, key: str) -> Any:
        """Get a project preference."""
        results = await self.retrieve(project_id, "preferences", key=key, limit=1)
        if results:
            return results[0].get("value", {}).get("value")
        return None

    async def store_schema_snapshot(
        self,
        project_id: str,
        table_name: str,
        columns: List[Dict],
        database: str = "postgresql",
    ) -> None:
        """Store a schema snapshot for drift detection."""
        await self.store(
            project_id=project_id,
            category="schemas",
            key=f"{database}.{table_name}",
            entry_type="schema_snapshot",
            value={
                "table": table_name,
                "database": database,
                "columns": columns,
                "column_count": len(columns),
            },
        )

    async def get_stats(self, project_id: str) -> Dict[str, Any]:
        """Get memory statistics for a project."""
        categories = {}
        for cat in ["architecture", "incidents", "preferences", "schemas", "pipelines"]:
            entries = await self.retrieve(project_id, cat)
            categories[cat] = len(entries)
        return {
            "project_id": project_id,
            "categories": categories,
            "total_entries": sum(categories.values()),
            "backend": "postgresql" if self._engine else "in-memory",
        }

    async def health(self) -> Dict[str, Any]:
        """Health check for project memory."""
        if self._engine:
            try:
                from sqlalchemy import text
                with self._engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
                return {"status": "healthy", "backend": "postgresql"}
            except Exception as e:
                return {"status": "degraded", "backend": "postgresql", "error": str(e)}
        return {"status": "healthy", "backend": "in-memory"}


# Singleton
project_memory = ProjectMemory()
