"""Tests for the Governance Agent."""

import pytest
from app.agents.governance_agent import GovernanceAgent


@pytest.mark.asyncio
async def test_governance_agent_allows_normal():
    """A basic pipeline request should be allowed."""
    agent = GovernanceAgent()
    result = await agent.run(
        user_id=1,
        action="create_pipeline",
        resource={"source_type": "postgres", "destination_type": "snowflake"},
    )
    assert result["allowed"] is True
    assert result["sensitivity"] == "low"


@pytest.mark.asyncio
async def test_governance_agent_detects_pii():
    """Pipeline config with PII keywords should be high sensitivity."""
    agent = GovernanceAgent()
    result = await agent.run(
        user_id=1,
        action="create_pipeline",
        resource={"source_type": "postgres", "transformations": ["mask_credit_card"]},
    )
    assert result["sensitivity"] == "high"
