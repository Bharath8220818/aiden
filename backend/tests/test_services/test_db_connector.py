"""
Tests for DatabaseConnector — focuses on database type detection
from connection string prefixes. These tests are purely unit-level
and do not require any running database.
"""

import pytest
from app.core.db_connector import DatabaseConnector


def test_db_detect_type_postgres():
    """Test PostgreSQL detection from various DSN formats."""
    connector = DatabaseConnector("postgresql://user:pass@host:5432/db")
    assert connector._detect_db_type("postgresql://user:pass@host:5432/db") == "postgres"
    assert connector._detect_db_type("postgresql+asyncpg://user:pass@host:5432/db") == "postgres"
    assert connector._detect_db_type("postgres://user:pass@host:5432/db") == "postgres"
    assert connector.db_type == "postgres"


def test_db_detect_type_sqlite():
    """Test SQLite detection."""
    assert DatabaseConnector._detect_db_type("sqlite:///./test.db") == "sqlite"
    assert DatabaseConnector._detect_db_type("sqlite+aiosqlite:///./test.db") == "sqlite"


def test_db_detect_type_bigquery():
    """Test BigQuery detection."""
    assert DatabaseConnector._detect_db_type("bigquery://project.dataset") == "bigquery"
    assert DatabaseConnector._detect_db_type("bq://project.dataset") == "bigquery"


def test_db_detect_type_empty_defaults_sqlite():
    """Test empty DSN defaults to SQLite."""
    assert DatabaseConnector._detect_db_type("") == "sqlite"


def test_db_detect_type_unknown_prefix():
    """Test unknown prefix defaults to postgres with a warning."""
    result = DatabaseConnector._detect_db_type("mysql://user:pass@host/db")
    # Unknown prefixes default to 'postgres'
    assert result == "postgres"


def test_db_type_property():
    """Test the db_type property after init."""
    connector = DatabaseConnector("sqlite:///./data.db")
    assert connector.db_type == "sqlite"
    assert connector.is_connected is False


def test_bigquery_parse_dsn():
    """Test BigQuery DSN parsing."""
    # Dot format
    connector = DatabaseConnector("bigquery://my-project.my_dataset")
    assert connector._bq_project == "my-project"
    assert connector._bq_dataset == "my_dataset"

    # Slash format
    connector = DatabaseConnector("bigquery://my-project/my_dataset")
    assert connector._bq_project == "my-project"
    assert connector._bq_dataset == "my_dataset"


def test_bigquery_parse_dsn_malformed():
    """Test that malformed BigQuery DSN raises ValueError."""
    with pytest.raises(ValueError, match="Malformed BigQuery DSN"):
        DatabaseConnector("bigquery://")


def test_bigquery_table_ref():
    """Test BigQuery fully-qualified table reference generation."""
    connector = DatabaseConnector("bigquery://project.dataset")
    assert connector._bq_table_ref("users") == "project.dataset.users"
