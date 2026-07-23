"""
Tests for IntentParser — focuses on rule-based fallback logic.
The rule-based parser runs even when HuggingFace is unavailable.
"""

import pytest
from app.core.intent_parser import IntentParser


@pytest.mark.asyncio
async def test_intent_parser_rule_based_postgres_to_snowflake():
    """Test rule-based parser detects PostgreSQL → Snowflake."""
    parser = IntentParser()
    result = await parser.parse("Build a pipeline from PostgreSQL to Snowflake")

    assert result["source_type"] == "postgres"
    assert result["destination_type"] == "snowflake"
    assert "name" in result
    assert result["name"] == "postgres_to_snowflake_pipeline"


@pytest.mark.asyncio
async def test_intent_parser_rule_based_mysql_to_bigquery():
    """Test rule-based parser detects MySQL → BigQuery."""
    parser = IntentParser()
    result = await parser.parse("Load data from MySQL to BigQuery")

    assert result["source_type"] == "mysql"
    assert result["destination_type"] == "bigquery"


@pytest.mark.asyncio
async def test_intent_parser_detects_schedule_hourly():
    """Test hourly schedule detection."""
    parser = IntentParser()
    result = await parser.parse("Run this pipeline hourly from postgres to snowflake")

    assert result["schedule"] == "0 * * * *"  # hourly


@pytest.mark.asyncio
async def test_intent_parser_detects_schedule_daily():
    """Test daily schedule is the default."""
    parser = IntentParser()
    result = await parser.parse("Run from postgres to snowflake")

    assert result["schedule"] == "0 6 * * *"  # default daily at 6am


@pytest.mark.asyncio
async def test_intent_parser_detects_schedule_weekly():
    """Test weekly schedule detection."""
    parser = IntentParser()
    result = await parser.parse("Build a weekly report from postgres to snowflake")

    assert result["schedule"] == "0 0 * * 0"  # Sunday midnight


@pytest.mark.asyncio
async def test_intent_parser_detects_transformations():
    """Test transformation detection."""
    parser = IntentParser()
    result = await parser.parse(
        "Clean and aggregate data from postgres to snowflake, "
        "remove nulls and duplicates"
    )

    assert "clean" in result["transformations"]
    assert "aggregate" in result["transformations"]
    assert "no_null_values" in result["data_quality_rules"]
    assert "no_duplicates" in result["data_quality_rules"]


@pytest.mark.asyncio
async def test_intent_parser_extracts_table_name():
    """Test table name extraction."""
    parser = IntentParser()
    result = await parser.parse(
        "Build pipeline from table 'sales_orders' in postgres to snowflake"
    )

    assert result["source_config"].get("table") == "sales_orders"


@pytest.mark.asyncio
async def test_intent_parser_fallback_with_empty_query():
    """Test parser handles empty query gracefully."""
    parser = IntentParser()
    result = await parser.parse("")

    assert "name" in result
    assert "source_type" in result
    assert "destination_type" in result
    assert "transformations" in result
    assert "schedule" in result


@pytest.mark.asyncio
async def test_intent_parser_unknown_source_destination():
    """Test parser handles unknown source/destination gracefully."""
    parser = IntentParser()
    result = await parser.parse("Move stuff from one place to another")

    assert result["source_type"] == "unknown"
    assert result["destination_type"] == "unknown"
    assert result["name"] == "unknown_to_unknown_pipeline"


@pytest.mark.asyncio
async def test_intent_parser_validate():
    """Test internal validation logic."""
    parser = IntentParser()
    # A valid result should have all required fields
    valid = {"name": "Test", "source_type": "postgres", "destination_type": "snowflake"}
    assert parser._validate(valid) is True

    # Missing fields should fail
    invalid = {"name": "Test"}
    assert parser._validate(invalid) is False

    empty = {}
    assert parser._validate(empty) is False
