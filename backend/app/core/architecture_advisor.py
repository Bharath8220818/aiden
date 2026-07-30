"""
Architecture Advisor — Recommends cloud architecture patterns.

Analyzes pipeline requirements (source, destination, latency, volume)
and recommends Lambda, Kappa, or Medallion architecture.
"""

import logging
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class ArchitectureRecommendation:
    pattern: str  # lambda, kappa, medallion
    title: str
    description: str
    services: List[str] = field(default_factory=list)
    rationale: str = ""
    estimated_cost: str = ""
    pros: List[str] = field(default_factory=list)
    cons: List[str] = field(default_factory=list)
    terraform_suggestion: str = ""


class ArchitectureAdvisor:
    """Analyze pipeline requirements and recommend architecture patterns."""

    PATTERNS = {
        "lambda": {
            "title": "Lambda Architecture",
            "description": "Batch and stream processing layers with a serving layer for query results.",
            "services": ["Apache Kafka", "Apache Spark (batch)", "Apache Flink (stream)", "Apache HBase/Druid"],
            "pros": ["Handles both batch and real-time data", "Fault-tolerant", "Well-understood pattern"],
            "cons": ["Complex to maintain (two code paths)", "Higher operational cost", "Data duplication possible"],
            "terraform_suggestion": "Lambda is best deployed on AWS (Kinesis + EMR + Redshift) or GCP (Pub/Sub + Dataflow + BigQuery).",
        },
        "kappa": {
            "title": "Kappa Architecture",
            "description": "Single stream processing pipeline — all data flows through a stream, batch is treated as a special case of streaming.",
            "services": ["Apache Kafka", "Apache Flink", "ksqlDB", "Apache Cassandra"],
            "pros": ["Single code path — simpler than Lambda", "Lower operational overhead", "Real-time by default"],
            "cons": ["Reprocessing historical data requires replaying streams", "Stream processing expertise needed", "Less mature batch tooling"],
            "terraform_suggestion": "Kappa works well on Confluent Cloud + Flink + Cassandra, or GCP Pub/Sub + Dataflow.",
        },
        "medallion": {
            "title": "Medallion (Bronze/Silver/Gold) Architecture",
            "description": "Multi-hop data lakehouse with Bronze (raw), Silver (cleaned), and Gold (aggregated) layers.",
            "services": ["Apache Spark / Delta Lake", "dbt", "Apache Iceberg", "Snowflake / Databricks"],
            "pros": ["Clear data lineage", "Supports both batch and streaming", "Well-suited for data quality checks", "Industry standard for data lakehouses"],
            "cons": ["Storage costs (three copies of data)", "Latency added by each hop", "Requires strong catalog/metadata management"],
            "terraform_suggestion": "Medallion is the natural fit for Databricks (Unity Catalog) or Snowflake with dbt transformations.",
        },
    }

    def recommend(self, config: Dict[str, Any]) -> ArchitectureRecommendation:
        """Recommend an architecture pattern based on the pipeline config."""
        source = config.get("source_type", "").lower()
        destination = config.get("destination_type", "").lower()
        transforms = config.get("transformations", [])
        schedule = config.get("schedule", "")
        has_stream = source in ("kafka", "mqtt", "websocket")
        has_batch = bool(schedule) and "*" not in schedule.split(" ")[:1]
        has_transforms = len(transforms) > 2
        is_warehouse = destination in ("snowflake", "bigquery", "redshift", "databricks")

        if has_stream and not has_batch:
            pattern_key = "kappa"
        elif is_warehouse and has_transforms:
            pattern_key = "medallion"
        else:
            pattern_key = "lambda"

        pattern = self.PATTERNS[pattern_key]

        # Adjust rationale
        if pattern_key == "kappa":
            rationale = f"Streaming source ({source}) detected. Kappa's single-pipeline model handles real-time data efficiently."
        elif pattern_key == "medallion":
            rationale = f"Data warehouse destination ({destination}) with multiple transformations. Medallion layers ensure data quality."
        else:
            rationale = f"Mixed batch/stream workload with transformations. Lambda architecture provides flexibility."

        return ArchitectureRecommendation(
            pattern=pattern_key,
            title=pattern["title"],
            description=pattern["description"],
            services=pattern["services"],
            rationale=rationale,
            estimated_cost=self._estimate_cost(pattern_key, transforms),
            pros=pattern["pros"],
            cons=pattern["cons"],
            terraform_suggestion=pattern["terraform_suggestion"],
        )

    @staticmethod
    def _estimate_cost(pattern: str, transforms: List[str]) -> str:
        base_costs = {"lambda": "$500-2000/mo", "kappa": "$300-1000/mo", "medallion": "$800-3000/mo"}
        cost = base_costs.get(pattern, "$500/mo")
        if len(transforms) > 3:
            cost = cost.replace("500", "800").replace("300", "500")
        return cost
