"""Tests for the Governance module."""

import pytest
from app.core.governance import GovernanceEngine, ComplianceValidator


@pytest.mark.asyncio
async def test_governance_engine_check_permission():
    """Test that admin users have all permissions."""
    from app.models.user import User
    admin = User(
        id=1,
        username="admin",
        email="admin@aiden.ai",
        is_superuser=True,
    )
    engine = GovernanceEngine(db=None)  # type: ignore[arg-type]

    assert engine.check_permission(admin, "create") is True
    assert engine.check_permission(admin, "delete") is True
    assert engine.check_permission(admin, "manage_users") is True


@pytest.mark.asyncio
async def test_compliance_validator_empty_config():
    """Test compliance validator with minimal config."""
    warnings = await ComplianceValidator.validate_pipeline_config({
        "source_type": "postgres",
        "destination_type": "snowflake",
    })
    assert isinstance(warnings, list)
    assert len(warnings) > 0  # Should warn about missing schedule, PII, etc.
