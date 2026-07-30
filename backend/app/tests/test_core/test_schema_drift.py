"""Tests for the Schema Drift module."""

import pytest
from app.core.schema_drift import SchemaDriftDetector, TableSchema, ColumnInfo


class TestSchemaDrift:
    def test_no_drift(self):
        """Identical schemas should report no drift."""
        source = TableSchema(
            table_name="test",
            columns=[
                ColumnInfo(name="id", data_type="int", nullable=False, primary_key=True),
                ColumnInfo(name="name", data_type="varchar", nullable=True),
            ],
        )
        target = TableSchema(
            table_name="test",
            columns=[
                ColumnInfo(name="id", data_type="int", nullable=False, primary_key=True),
                ColumnInfo(name="name", data_type="varchar", nullable=True),
            ],
        )
        diff = SchemaDriftDetector.compare(source, target)
        assert not diff.has_changes

    def test_added_column(self):
        """Added columns should be detected."""
        source = TableSchema(table_name="test", columns=[
            ColumnInfo(name="id", data_type="int", nullable=False),
        ])
        target = TableSchema(table_name="test", columns=[
            ColumnInfo(name="id", data_type="int", nullable=False),
            ColumnInfo(name="email", data_type="varchar", nullable=True),
        ])
        diff = SchemaDriftDetector.compare(source, target)
        assert diff.has_changes
        assert len(diff.added_columns) == 1
        assert diff.added_columns[0].name == "email"

    def test_removed_column_is_high_severity(self):
        """Removed columns should be high severity."""
        source = TableSchema(table_name="test", columns=[
            ColumnInfo(name="id", data_type="int", nullable=False),
            ColumnInfo(name="name", data_type="varchar", nullable=True),
        ])
        target = TableSchema(table_name="test", columns=[
            ColumnInfo(name="id", data_type="int", nullable=False),
        ])
        diff = SchemaDriftDetector.compare(source, target)
        assert diff.has_changes
        assert diff.drift_severity == "high"

    def test_type_change_is_medium_severity(self):
        """Type changes should be medium severity."""
        source = TableSchema(table_name="test", columns=[
            ColumnInfo(name="id", data_type="int", nullable=False),
        ])
        target = TableSchema(table_name="test", columns=[
            ColumnInfo(name="id", data_type="bigint", nullable=False),
        ])
        diff = SchemaDriftDetector.compare(source, target)
        assert diff.has_changes
        assert diff.drift_severity == "medium"

    def test_suggest_fix(self):
        """Fix suggestions should be generated correctly."""
        diff = SchemaDriftDetector.compare(
            TableSchema(table_name="t", columns=[
                ColumnInfo(name="old_col", data_type="int", nullable=False),
            ]),
            TableSchema(table_name="t", columns=[
                ColumnInfo(name="id", data_type="int", nullable=False),
            ]),
        )
        fix = SchemaDriftDetector.suggest_fix(diff)
        assert fix is not None
        assert "old_col" in fix
