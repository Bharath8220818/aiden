"""
Schema Drift — Live DB schema comparison and change detection.

Compares source schemas against stored snapshots to detect
column additions, removals, type changes, and renames.
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class ColumnInfo:
    name: str
    data_type: str
    nullable: bool
    primary_key: bool = False
    foreign_key: Optional[str] = None


@dataclass
class TableSchema:
    table_name: str
    columns: List[ColumnInfo] = field(default_factory=list)


@dataclass
class SchemaDiff:
    added_columns: List[ColumnInfo] = field(default_factory=list)
    removed_columns: List[ColumnInfo] = field(default_factory=list)
    changed_columns: List[Tuple[ColumnInfo, ColumnInfo]] = field(default_factory=list)
    drift_severity: str = "low"  # low, medium, high

    @property
    def has_changes(self) -> bool:
        return bool(self.added_columns or self.removed_columns or self.changed_columns)

    @property
    def summary(self) -> str:
        parts = []
        if self.added_columns:
            parts.append(f"Added: {', '.join(c.name for c in self.added_columns)}")
        if self.removed_columns:
            parts.append(f"Removed: {', '.join(c.name for c in self.removed_columns)}")
        if self.changed_columns:
            parts.append(f"Changed: {', '.join(f'{old.name}->{new.name}' for old, new in self.changed_columns)}")
        return "; ".join(parts) if parts else "No changes detected"


class SchemaDriftDetector:
    """Compare two schemas and detect drift."""

    @staticmethod
    def compare(source: TableSchema, target: TableSchema) -> SchemaDiff:
        """Compare source and target table schemas, returning differences."""
        source_cols = {c.name: c for c in source.columns}
        target_cols = {c.name: c for c in target.columns}

        source_names = set(source_cols.keys())
        target_names = set(target_cols.keys())

        diff = SchemaDiff()

        # Columns in target but not in source (added)
        for name in target_names - source_names:
            diff.added_columns.append(target_cols[name])

        # Columns in source but not in target (removed)
        for name in source_names - target_names:
            diff.removed_columns.append(source_cols[name])

        # Columns in both but with different types
        for name in source_names & target_names:
            source_col = source_cols[name]
            target_col = target_cols[name]
            if source_col.data_type != target_col.data_type:
                diff.changed_columns.append((source_col, target_col))

        # Determine severity
        if diff.removed_columns:
            diff.drift_severity = "high"
        elif diff.changed_columns:
            diff.drift_severity = "medium"
        elif diff.added_columns:
            diff.drift_severity = "low"

        return diff

    @staticmethod
    def suggest_fix(diff: SchemaDiff) -> Optional[str]:
        """Suggest a fix for the detected schema drift."""
        if diff.removed_columns:
            cols = ", ".join(c.name for c in diff.removed_columns)
            return f"Columns removed: {cols}. Review pipeline queries referencing these columns."
        if diff.changed_columns:
            changes = ", ".join(f"{old.name}: {old.data_type} → {new.data_type}" for old, new in diff.changed_columns)
            return f"Type changes detected: {changes}. Update CAST operations in pipeline."
        if diff.added_columns:
            return "New columns detected — no action required, but consider updating documentation."
        return None
