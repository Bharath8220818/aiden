"""Drift detection — deterministic schema profiling, snapshotting, comparison.

Pipeline (spec §P1.5 — version 1, no ML):

    connection → profiler (deterministic introspection)
      → schema snapshot (columns + row count + schema_hash)
      → compare against previous snapshot
      → change detected? → incident (RCA → fix proposal flow)

The profiler is **deterministic**: the same connection state always produces
the same snapshot hash, so a hash change *is* a schema change. Monitored v1
signals: table existence, column existence, column type, nullability, row
count. Detected drift creates an Incident (detection_source="drift") so the
existing RCA → fix → approval → heal flow takes over unchanged.

Live profiling runs a real read-only introspection query against the
connection's database when it speaks PostgreSQL/MySQL; otherwise a
deterministic derived snapshot (stable per table, rotates only when platform
state changes) keeps the workflow testable without live engines.
"""

from __future__ import annotations

import hashlib
import json
import uuid
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models import (
    Incident,
    IncidentSeverity,
    IncidentStatus,
    Pipeline,
    SchemaSnapshot,
)
from app.services.event_bus import broadcast_platform_event

logger = get_logger("aiden.drift")

# Row-count delta ratio that counts as drift (v1 signal).
ROW_COUNT_DRIFT_RATIO = 0.5


@dataclass(frozen=True)
class ColumnProfile:
    name: str
    data_type: str
    nullable: bool

    def as_dict(self) -> dict[str, Any]:
        return {"name": self.name, "dataType": self.data_type, "nullable": self.nullable}


@dataclass(frozen=True)
class TableProfile:
    table: str
    exists: bool
    row_count: int | None
    columns: list[ColumnProfile]

    @property
    def column_names(self) -> list[str]:
        return [c.name for c in self.columns]


# --------------------------------------------------------------------------- #
# Profiler — deterministic introspection
# --------------------------------------------------------------------------- #
_INTROSPECTION_SQL = """
SELECT
    c.column_name,
    c.data_type,
    c.is_nullable = 'YES' AS nullable,
    c.ordinal_position
FROM information_schema.columns c
WHERE c.table_schema = :schema AND c.table_name = :table
ORDER BY c.ordinal_position
"""

_ROW_COUNT_SQL = 'SELECT COUNT(*) FROM "{schema}"."{table}"'


class SchemaProfiler:
    """Profiles a table through a live SQLAlchemy-compatible connection.

    `connect` yields a session-like object (execute(sql, params)) for the
    target database. In tests this is a stub over SQLite; in production it is
    an engine created from the connection registry's credentials.
    """

    def __init__(self, connect: Callable[[], Any]) -> None:
        self._connect = connect

    async def profile(self, table: str, *, schema: str = "public") -> TableProfile:
        schema_part, _, table_part = table.partition(".")
        if table_part:  # allow "schema.table" naming
            schema, table = schema_part, table_part

        session = self._connect()
        try:
            rows = (
                await session.execute(
                    _INTROSPECTION_SQL, {"schema": schema, "table": table}
                )
            ).fetchall()
        except Exception:
            return TableProfile(table=table, exists=False, row_count=None, columns=[])

        if not rows:
            return TableProfile(table=table, exists=False, row_count=None, columns=[])

        columns = [
            ColumnProfile(name=r[0], data_type=r[1], nullable=bool(r[2])) for r in rows
        ]
        row_count: int | None = None
        try:
            row_count = int(
                (
                    await session.execute(
                        _ROW_COUNT_SQL.format(schema=schema, table=table)
                    )
                ).scalar_one()
            )
        except Exception:  # noqa: BLE001 — row count is best-effort
            logger.info("Row-count probe failed for %s.%s", schema, table)

        return TableProfile(
            table=table, exists=True, row_count=row_count, columns=columns
        )


# --------------------------------------------------------------------------- #
# Snapshot hashing + comparison
# --------------------------------------------------------------------------- #
def schema_hash(columns: list[dict[str, Any]]) -> str:
    """Deterministic hash of the schema shape (names, types, nullability)."""
    canonical = [
        {"name": c.get("name"), "type": c.get("dataType"), "nullable": bool(c.get("nullable"))}
        for c in (columns or [])
    ]
    payload = json.dumps(canonical, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode()).hexdigest()


def diff_snapshots(
    previous: SchemaSnapshot, current_profile: TableProfile
) -> dict[str, Any]:
    """Compare a stored snapshot against a fresh profile.

    Returns {changed, schemaChanged, rowCountChanged, changes[]}.
    """
    changes: list[dict[str, Any]] = []
    prev_cols: dict[str, dict] = {
        c.get("name"): c for c in (previous.columns or []) if c.get("name")
    }
    curr_cols: dict[str, ColumnProfile] = {c.name: c for c in current_profile.columns}

    if not current_profile.exists and prev_cols:
        changes.append(
            {"kind": "table_missing", "table": current_profile.table, "severity": "critical"}
        )
    else:
        for name, prev in prev_cols.items():
            if name not in curr_cols:
                changes.append(
                    {"kind": "column_removed", "column": name, "severity": "critical"}
                )
                continue
            curr = curr_cols[name]
            if str(prev.get("dataType")) != curr.data_type:
                changes.append(
                    {
                        "kind": "column_type_changed",
                        "column": name,
                        "from": str(prev.get("dataType")),
                        "to": curr.data_type,
                        "severity": "high",
                    }
                )
            if bool(prev.get("nullable")) != curr.nullable:
                changes.append(
                    {
                        "kind": "nullability_changed",
                        "column": name,
                        "from": bool(prev.get("nullable")),
                        "to": curr.nullable,
                        "severity": "medium",
                    }
                )
        for name in curr_cols:
            if name not in prev_cols:
                changes.append(
                    {"kind": "column_added", "column": name, "severity": "low"}
                )

    hash_changed = schema_hash([c.as_dict() for c in current_profile.columns]) != previous.schema_hash
    row_changed = (
        previous.row_count is not None
        and current_profile.row_count is not None
        and previous.row_count > 0
        and abs(current_profile.row_count - previous.row_count) / previous.row_count
        > ROW_COUNT_DRIFT_RATIO
    )

    return {
        "changed": bool(changes) or hash_changed or row_changed,
        "schemaChanged": hash_changed,
        "rowCountChanged": row_changed,
        "changes": changes,
    }


def worst_severity(changes: list[dict[str, Any]]) -> IncidentSeverity:
    rank = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    worst = min((rank.get(c.get("severity"), 3) for c in changes), default=3)
    return {
        0: IncidentSeverity.critical,
        1: IncidentSeverity.high,
        2: IncidentSeverity.medium,
        3: IncidentSeverity.low,
    }[worst]


# --------------------------------------------------------------------------- #
# Service — snapshot capture + drift incidents
# --------------------------------------------------------------------------- #
class DriftService:
    """Captures snapshots, detects drift, opens incidents on change."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def latest_snapshot(self, pipeline_id: uuid.UUID, table: str) -> SchemaSnapshot | None:
        result = await self.db.execute(
            select(SchemaSnapshot)
            .where(
                SchemaSnapshot.pipeline_id == pipeline_id,
                SchemaSnapshot.table_name == table,
            )
            .order_by(SchemaSnapshot.captured_at.desc())
            .limit(1)
        )
        return result.scalars().first()

    async def capture(
        self,
        pipeline_id: uuid.UUID,
        table: str,
        profile: TableProfile,
        *,
        create_incident_on_drift: bool = True,
    ) -> dict[str, Any]:
        """Persist a snapshot; when the schema differs from the previous one,
        open a drift incident so the healing loop takes over."""
        previous = await self.latest_snapshot(pipeline_id, table)
        columns = [c.as_dict() for c in profile.columns]
        changed = 0
        change_summary: str | None = None
        incident: Incident | None = None

        if previous is not None:
            comparison = diff_snapshots(previous, profile)
            schema_changes = comparison["changes"]
            changed = len(schema_changes)
            if comparison["schemaChanged"] and schema_changes:
                change_summary = "; ".join(
                    _describe_change(c) for c in schema_changes[:6]
                )
                if create_incident_on_drift:
                    incident = await self._open_incident(
                        pipeline_id, table, previous, schema_changes
                    )
            elif comparison["rowCountChanged"]:
                change_summary = (
                    f"Row count drifted {previous.row_count} → {profile.row_count}"
                )
        else:
            change_summary = "Baseline snapshot captured"

        snapshot = SchemaSnapshot(
            pipeline_id=pipeline_id,
            table_name=table,
            columns=columns,
            row_count=profile.row_count,
            schema_hash=schema_hash(columns) if profile.exists else previous.schema_hash if previous else schema_hash([]),
            columns_changed=changed,
            change_summary=change_summary,
            captured_at=datetime.now(UTC),
        )
        self.db.add(snapshot)
        await self.db.commit()
        await self.db.refresh(snapshot)

        return {
            "snapshotId": str(snapshot.id),
            "pipelineId": str(pipeline_id),
            "table": table,
            "schemaHash": snapshot.schema_hash,
            "rowCount": snapshot.row_count,
            "columnsChanged": changed,
            "changeSummary": change_summary,
            "drifted": bool(incident),
            "incidentId": str(incident.id) if incident else None,
        }

    async def _open_incident(
        self,
        pipeline_id: uuid.UUID,
        table: str,
        previous: SchemaSnapshot,
        changes: list[dict[str, Any]],
    ) -> Incident:
        pipeline = await self.db.get(Pipeline, pipeline_id)
        pipeline_name = pipeline.name if pipeline else f"pipeline {pipeline_id}"
        summary = "; ".join(_describe_change(c) for c in changes[:4])
        title = f"Schema drift on {table}"
        incident = Incident(
            project_id=pipeline.project_id if pipeline else None,
            pipeline_run_id=None,
            title=title,
            severity=worst_severity(changes),
            status=IncidentStatus.detected,
            detection_source="drift",
            root_cause={
                "type": "schema_drift",
                "table": table,
                "pipeline": pipeline_name,
                "previousHash": previous.schema_hash,
                "changes": changes[:20],
            },
            proposed_fix={
                "summary": (
                    "Review contract update, align upstream schema, or add a "
                    "compatibility transform before the next scheduled run."
                ),
                "changes": changes[:20],
            },
        )
        self.db.add(incident)
        await self.db.flush()

        await broadcast_platform_event(
            type="incident",
            title="Schema drift detected",
            message=f"{pipeline_name}: {table} — {summary}",
            link="/incidents",
        )
        return incident


def _describe_change(change: dict[str, Any]) -> str:
    kind = change.get("kind")
    if kind == "column_type_changed":
        return f"{change['column']}: {change['from']} → {change['to']}"
    if kind == "column_added":
        return f"{change['column']} added"
    if kind == "column_removed":
        return f"{change['column']} removed"
    if kind == "nullability_changed":
        return f"{change['column']}: nullable {change['from']} → {change['to']}"
    if kind == "table_missing":
        return "table no longer exists"
    return kind or "unknown change"
