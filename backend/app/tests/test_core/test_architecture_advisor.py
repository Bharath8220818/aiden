"""Tests for the Architecture Advisor module."""

import pytest
from app.core.architecture_advisor import ArchitectureAdvisor


class TestArchitectureAdvisor:
    def setup_method(self):
        self.advisor = ArchitectureAdvisor()

    def test_lambda_recommendation(self):
        """Mixed batch/stream workload should recommend Lambda."""
        config = {
            "source_type": "postgres",
            "destination_type": "snowflake",
            "transformations": ["clean"],
            "schedule": "0 6 * * *",
        }
        rec = self.advisor.recommend(config)
        assert rec.pattern in ("lambda", "medallion")

    def test_kappa_recommendation(self):
        """Streaming source should recommend Kappa."""
        config = {
            "source_type": "kafka",
            "destination_type": "snowflake",
            "transformations": [],
            "schedule": "",
        }
        rec = self.advisor.recommend(config)
        assert rec.pattern == "kappa"

    def test_medallion_recommendation(self):
        """Warehouse destination with many transforms should recommend Medallion."""
        config = {
            "source_type": "postgres",
            "destination_type": "snowflake",
            "transformations": ["clean", "aggregate", "join", "validate", "enrich"],
            "schedule": "0 6 * * *",
        }
        rec = self.advisor.recommend(config)
        assert rec.pattern == "medallion"

    def test_all_patterns_have_required_fields(self):
        """All architecture patterns should have all required fields."""
        for key in ("lambda", "kappa", "medallion"):
            pattern = self.advisor.PATTERNS[key]
            assert "title" in pattern
            assert "description" in pattern
            assert "services" in pattern
            assert "pros" in pattern
            assert "cons" in pattern
