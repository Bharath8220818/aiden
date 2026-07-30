"""Tests for the Monitoring Agent."""

import pytest
from app.agents.monitoring_agent import MonitoringAgent


@pytest.mark.asyncio
async def test_monitoring_agent_healthy():
    """A fast execution with no errors should be healthy."""
    agent = MonitoringAgent()
    result = await agent.run({
        "duration_seconds": 30,
        "error_rate": 0.0,
        "records_processed": 10000,
    })
    assert result["status"] == "healthy"
    assert len(result["alerts"]) == 0


@pytest.mark.asyncio
async def test_monitoring_agent_slow_execution():
    """A long execution should trigger a warning."""
    agent = MonitoringAgent()
    result = await agent.run({
        "duration_seconds": 7200,  # 2 hours
        "error_rate": 0.0,
        "records_processed": 1000,
    })
    assert result["status"] in ("warning", "critical")


@pytest.mark.asyncio
async def test_monitoring_agent_high_error_rate():
    """High error rate should be critical."""
    agent = MonitoringAgent()
    result = await agent.run({
        "duration_seconds": 30,
        "error_rate": 0.5,
        "records_processed": 1000,
    })
    assert result["status"] == "critical"
    assert any("error rate" in a.lower() for a in result["alerts"])
