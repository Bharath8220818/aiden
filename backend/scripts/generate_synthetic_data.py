"""
Generate synthetic training data for AIDEN agents.

Two modes:
  1. Template-based (default):   No API key needed — generates varied examples
     using predefined templates covering all 5 agent types.
  2. LLM-based (--llm):          Uses OpenAI/Ollama for more realistic examples.

Usage:
    # Template mode (all 5 agents)
    python scripts/generate_synthetic_data.py --agent intent --count 200
    python scripts/generate_synthetic_data.py --agent self_healing --count 150
    python scripts/generate_synthetic_data.py --agent all

    # LLM mode (requires OPENAI_API_KEY)
    python scripts/generate_synthetic_data.py --agent all --llm --num 100

    # Custom output
    python scripts/generate_synthetic_data.py --agent intent --count 50 --output data/my_data.jsonl
"""

import argparse
import json
import logging
import os
import random
import sys
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════
# TEMPLATE-BASED GENERATORS (no API key needed)
# ═══════════════════════════════════════════════════════════════════════


class SyntheticDataGenerator:
    """Generates synthetic training data using templates for all agent types."""

    def __init__(self, seed: int = 42):
        random.seed(seed)
        self._templates = self._load_templates()

    # ── Templates per Agent Type ───────────────────────────────────────

    def _load_templates(self) -> dict:
        return {
            # ── Intent Parser ───────────────────────────────────────────
            "intent": {
                "sources": [
                    "postgres", "mysql", "snowflake", "s3", "kafka",
                    "mongodb", "bigquery", "oracle", "redis", "elasticsearch",
                    "salesforce", "zendesk", "stripe", "google_analytics",
                    "github", "jira", "slack_api", "rabbitmq", "mqtt", "rss",
                ],
                "destinations": [
                    "snowflake", "bigquery", "postgres", "s3", "redshift",
                    "elasticsearch", "mongodb", "redis", "athena", "influxdb",
                    "datadog", "grafana", "pagerduty", "salesforce",
                    "azuresql", "sagemaker", "looker", "algolia",
                ],
                "frequencies": ["daily", "hourly", "weekly", "real-time", "monthly"],
                "transforms": [
                    "clean", "aggregate", "join", "filter", "enrich",
                    "validate", "deduplicate", "normalize", "anonymize",
                    "parse_json", "calculate_metrics", "geoip_lookup",
                    "sentiment_analysis", "feature_engineering",
                ],
                "quality_rules": [
                    "no_null_primary_key", "amount_positive", "email_format_valid",
                    "timestamp_valid", "sku_not_null", "session_id_not_null",
                    "campaign_id_exists", "row_count_matches", "user_id_valid",
                    "price_positive", "order_id_unique", "metric_within_range",
                ],
                "patterns": [
                    "Build a {frequency} {source} to {destination} pipeline",
                    "Create a pipeline that extracts from {source} and loads to {destination}",
                    "I need a {frequency} ETL from {source} to {destination}",
                    "Set up a data pipeline from {source} to {destination} running {frequency}",
                    "Build a pipeline to sync {source} data to {destination} {frequency}",
                    "Create an automated data flow from {source} to {destination} ({frequency})",
                ],
            },
            # ── Self-Healing ────────────────────────────────────────────
            "self_healing": {
                "scenarios": [
                    {
                        "error": "column 'customer_id' does not exist in relation",
                        "category": "schema_drift",
                        "fix": "Update SQL to reference correct column name via schema inspection",
                        "severity": "high",
                    },
                    {
                        "error": "null value violates not-null constraint on column 'email'",
                        "category": "data_quality",
                        "fix": "Add COALESCE or default value for null columns before insert",
                        "severity": "medium",
                    },
                    {
                        "error": "duplicate key value violates unique constraint on 'order_id'",
                        "category": "data_quality",
                        "fix": "Add deduplication step: use ON CONFLICT DO UPDATE or pre-dedup",
                        "severity": "high",
                    },
                    {
                        "error": "HTTP connection pool timeout after 30 seconds",
                        "category": "connection",
                        "fix": "Increase timeout to 60s and add retry with exponential backoff",
                        "severity": "low",
                    },
                    {
                        "error": "permission denied for table sales_summary",
                        "category": "connection",
                        "fix": "Grant SELECT permission on the table or use a credentials rotation",
                        "severity": "high",
                    },
                    {
                        "error": "out of memory: cannot allocate 2GB for hash join",
                        "category": "performance",
                        "fix": "Reduce batch size and add incremental processing with checkpointing",
                        "severity": "medium",
                    },
                    {
                        "error": "deadlock detected while waiting for resource",
                        "category": "performance",
                        "fix": "Add retry logic with random jitter and reduce transaction scope",
                        "severity": "medium",
                    },
                    {
                        "error": "division by zero in transformation step",
                        "category": "data_quality",
                        "fix": "Add zero-guard: use NULLIF(denominator, 0) or CASE WHEN denominator=0",
                        "severity": "low",
                    },
                    {
                        "error": "SSL certificate verify failed for database.example.com",
                        "category": "connection",
                        "fix": "Update CA certificate bundle and verify SSL config",
                        "severity": "high",
                    },
                    {
                        "error": "relation 'raw_events_202501' does not exist",
                        "category": "schema_drift",
                        "fix": "Update table reference to match current partition naming convention",
                        "severity": "medium",
                    },
                    {
                        "error": "cast from text to integer failed for value '$1,234.56'",
                        "category": "data_quality",
                        "fix": "Add data cleaning step: strip currency symbols before type cast",
                        "severity": "low",
                    },
                    {
                        "error": "disk quota exceeded for temp directory",
                        "category": "performance",
                        "fix": "Clean temp files, increase disk quota, and add disk usage monitoring",
                        "severity": "medium",
                    },
                ],
            },
            # ── Monitoring ──────────────────────────────────────────────
            "monitoring": {
                "health_states": ["healthy", "degraded", "failing", "recovering"],
                "alert_types": [
                    "latency_spike", "error_rate_increase", "throughput_drop",
                    "disk_usage_critical", "memory_pressure", "pipeline_stall",
                    "data_freshness_breach", "schema_change_detected",
                ],
                "patterns": [
                    "Pipeline {pipeline_name} has {alert_type} — current value: {value} {unit} (threshold: {threshold} {unit})",
                    "Alert: {alert_type} detected in {pipeline_name}. Action recommended: {action}",
                    "Health check for {pipeline_name}: status={health}, last_run={minutes}m ago, records={records}",
                ],
            },
            # ── Extraction ──────────────────────────────────────────────
            "extraction": {
                "db_sources": ["postgresql", "mysql", "oracle", "sqlserver", "mongodb"],
                "schema_objects": [
                    {"tables": ["users", "orders", "products"], "columns": 15},
                    {"tables": ["transactions", "customers"], "columns": 22},
                    {"tables": ["logs", "events", "sessions", "page_views"], "columns": 8},
                    {"tables": ["inventory", "suppliers", "purchase_orders"], "columns": 18},
                ],
            },
            # ── Pipeline Builder ────────────────────────────────────────
            "pipeline_builder": {
                "dag_types": ["airflow", "dagster", "prefect", "argo"],
                "dbt_models": ["staging", "intermediate", "marts", "metrics"],
            },
        }

    # ── Intent Parser Data ──────────────────────────────────────────────

    def generate_intent(self, count: int = 200) -> List[Dict]:
        """Generate intent-parsing training examples: prompt → JSON config."""
        templates = self._templates["intent"]
        data = []

        for _ in range(count):
            source = random.choice(templates["sources"])
            destination = random.choice(templates["destinations"])
            frequency = random.choice(templates["frequencies"])
            num_transforms = random.randint(1, 4)
            num_rules = random.randint(1, 3)
            transforms = random.sample(templates["transforms"], k=num_transforms)
            rules = random.sample(templates["quality_rules"], k=num_rules)

            pattern = random.choice(templates["patterns"])
            prompt = pattern.format(
                source=source,
                destination=destination,
                frequency=frequency,
                transforms=", ".join(transforms),
            )

            schedule_map = {
                "daily": "0 6 * * *",
                "hourly": "0 * * * *",
                "weekly": "0 6 * * 1",
                "real-time": "* * * * *",
                "monthly": "0 6 1 * *",
            }

            completion = {
                "name": f"{source}_to_{destination}_{frequency.replace('-', '_')}",
                "source_type": source,
                "source_config": {"table": f"{source}_data"},
                "destination_type": destination,
                "destination_config": {"schema": "analytics"},
                "transformations": transforms,
                "schedule": schedule_map.get(frequency, "0 6 * * *"),
                "data_quality_rules": rules,
            }

            data.append({
                "instruction": prompt,
                "output": json.dumps(completion),
            })

        return data

    # ── Self-Healing Data ──────────────────────────────────────────────

    def generate_self_healing(self, count: int = 150) -> List[Dict]:
        """Generate self-healing training examples: error → diagnosis + fix."""
        scenarios = self._templates["self_healing"]["scenarios"]
        data = []

        # Extend by varying the error messages
        for i in range(count):
            base = scenarios[i % len(scenarios)]
            pipeline_name = random.choice([
                "daily_sales_etl", "customer_sync", "log_aggregator",
                "inventory_pipeline", "fraud_detection",
            ])

            # Vary the instruction slightly
            prefixes = [
                f"Pipeline '{pipeline_name}' failed: ",
                f"Error in {pipeline_name}: ",
                f"Execution error on {pipeline_name}: ",
            ]
            instruction = f"{prefixes[i % len(prefixes)]}{base['error']}"

            # Build diagnosis + fix output
            completion = json.dumps({
                "diagnosis": {
                    "category": base["category"],
                    "severity": base["severity"],
                    "pipeline": pipeline_name,
                    "error": base["error"],
                    "confidence": round(random.uniform(0.75, 0.99), 2),
                },
                "fix_proposal": {
                    "action": base["fix"],
                    "risk_level": base["severity"].upper(),
                    "auto_approve": base["severity"] == "low",
                    "estimated_time_minutes": random.randint(1, 30),
                },
            })

            data.append({"instruction": instruction, "output": completion})

        return data

    # ── Monitoring Data ────────────────────────────────────────────────

    def generate_monitoring(self, count: int = 100) -> List[Dict]:
        """Generate monitoring training examples: health state → alert."""
        templates = self._templates["monitoring"]
        data = []

        pipeline_names = [
            "sales_etl", "customer_sync", "inventory_pipeline",
            "fraud_detection", "log_aggregator", "ml_feature_pipeline",
            "data_lake_ingestion", "real_time_dashboard",
        ]

        for _ in range(count):
            pipeline = random.choice(pipeline_names)
            health = random.choice(templates["health_states"])
            alert = random.choice(templates["alert_types"])
            pattern = random.choice(templates["patterns"])

            # Generate realistic values
            value_ranges = {
                "latency_spike": (500, 30000),
                "error_rate_increase": (1, 25),
                "throughput_drop": (10, 80),
                "disk_usage_critical": (85, 99),
                "memory_pressure": (70, 95),
                "pipeline_stall": (1, 60),
                "data_freshness_breach": (30, 360),
                "schema_change_detected": (1, 10),
            }
            threshold_ranges = {
                "latency_spike": (200, 1000),
                "error_rate_increase": (5, 15),
                "throughput_drop": (50, 90),
                "disk_usage_critical": (80, 90),
                "memory_pressure": (80, 90),
                "pipeline_stall": (5, 30),
                "data_freshness_breach": (60, 120),
                "schema_change_detected": (0, 0),
            }
            units = {
                "latency_spike": "ms", "error_rate_increase": "%",
                "throughput_drop": "%", "disk_usage_critical": "%",
                "memory_pressure": "%", "pipeline_stall": "min",
                "data_freshness_breach": "min", "schema_change_detected": "changes",
            }
            actions = {
                "latency_spike": "Investigate query performance",
                "error_rate_increase": "Check source system health",
                "throughput_drop": "Scale up worker pool",
                "disk_usage_critical": "Clean old data or increase disk",
                "memory_pressure": "Reduce batch size",
                "pipeline_stall": "Restart pipeline executor",
                "data_freshness_breach": "Check upstream data source",
                "schema_change_detected": "Review and approve schema migration",
            }

            value = random.randint(*value_ranges.get(alert, (1, 100)))
            threshold = random.randint(*threshold_ranges.get(alert, (1, 50)))
            unit = units.get(alert, "")
            action = actions.get(alert, "Investigate")

            instruction = pattern.format(
                pipeline_name=pipeline.replace("_", " ").title(),
                alert_type=alert.replace("_", " "),
                value=value,
                unit=unit,
                threshold=threshold,
                health=health,
                minutes=random.randint(1, 120),
                records=random.randint(1000, 5000000),
                action=action,
            )

            completion = json.dumps({
                "pipeline": pipeline,
                "health_status": health,
                "alert": {
                    "type": alert,
                    "value": value,
                    "unit": unit,
                    "threshold": threshold,
                    "severity": (
                        "critical" if value > threshold * 1.5 else
                        "warning" if value > threshold else
                        "info"
                    ),
                },
                "recommended_action": action,
            })

            data.append({"instruction": instruction, "output": completion})

        return data

    # ── Extraction Data ────────────────────────────────────────────────

    def generate_extraction(self, count: int = 80) -> List[Dict]:
        """Generate extraction training examples: source → schema + config."""
        templates = self._templates["extraction"]
        data = []

        for _ in range(count):
            db_type = random.choice(templates["db_sources"])
            schema_obj = random.choice(templates["schema_objects"])
            tables = schema_obj["tables"]
            columns = schema_obj["columns"]

            prompt = (
                f"Extract schema from {db_type} database. "
                f"Tables: {', '.join(tables)}. "
                f"Estimated {columns} columns total. "
                f"Provide complete schema with column names, types, and nullability."
            )

            # Generate mock column definitions
            col_types = [
                "integer", "varchar(255)", "timestamp", "boolean",
                "decimal(10,2)", "uuid", "text", "date", "jsonb", "bigint",
            ]
            mock_columns = []
            for t in tables:
                num_cols = random.randint(2, max(3, columns // len(tables)))
                mock_columns.append({
                    "table": t,
                    "columns": [
                        {
                            "name": f"col_{random.randint(100, 999)}",
                            "type": random.choice(col_types),
                            "nullable": random.choice([True, False, False, False]),
                            "primary_key": False,
                        }
                        for _ in range(num_cols)
                    ],
                })

            completion = json.dumps({
                "source_type": db_type,
                "connection_config": {
                    "host": f"{db_type}.example.com",
                    "port": {"postgresql": 5432, "mysql": 3306, "oracle": 1521, "sqlserver": 1433, "mongodb": 27017}.get(db_type, 5432),
                    "database": "analytics_db",
                    "schema": "public",
                },
                "tables": mock_columns,
                "total_columns": columns,
                "estimated_size_mb": random.randint(100, 10000),
            })

            data.append({"instruction": prompt, "output": completion})

        return data

    # ── Pipeline Builder Data ──────────────────────────────────────────

    def generate_pipeline_builder(self, count: int = 100) -> List[Dict]:
        """Generate pipeline builder training examples: config → code."""
        templates = self._templates["pipeline_builder"]
        data = []

        pipeline_configs = [
            {
                "name": "Sales ETL",
                "source": "postgres", "dest": "snowflake",
                "schedule": "0 6 * * *",
                "transforms": ["clean", "aggregate"],
            },
            {
                "name": "Customer Sync",
                "source": "mysql", "dest": "bigquery",
                "schedule": "0 * * * *",
                "transforms": ["clean", "enrich", "validate"],
            },
            {
                "name": "IoT Stream",
                "source": "kafka", "dest": "s3",
                "schedule": "* * * * *",
                "transforms": ["filter", "aggregate"],
            },
            {
                "name": "Inventory Pipeline",
                "source": "postgres", "dest": "postgres",
                "schedule": "0 2 * * *",
                "transforms": ["deduplicate", "calculate"],
            },
            {
                "name": "Fraud Detection",
                "source": "kafka", "dest": "redis",
                "schedule": "* * * * *",
                "transforms": ["feature_extraction", "ml_scoring"],
            },
            {
                "name": "Log Aggregation",
                "source": "s3", "dest": "athena",
                "schedule": "0 * * * *",
                "transforms": ["parse", "partition", "compress"],
            },
            {
                "name": "Financial Reports",
                "source": "oracle", "dest": "snowflake",
                "schedule": "0 7 * * *",
                "transforms": ["currency_conversion", "aggregate_by_period", "validate"],
            },
            {
                "name": "CRM Sync",
                "source": "salesforce", "dest": "postgres",
                "schedule": "0 4 * * 1",
                "transforms": ["map_fields", "deduplicate"],
            },
            {
                "name": "Web Analytics",
                "source": "google_analytics", "dest": "snowflake",
                "schedule": "0 4 * * *",
                "transforms": ["flatten_nested", "calculate_funnel", "enrich"],
            },
            {
                "name": "Market Data Feed",
                "source": "bloomberg", "dest": "s3",
                "schedule": "0 8 * * 1",
                "transforms": ["normalize", "calculate_moving_average"],
            },
            {
                "name": "Subscription Analytics",
                "source": "stripe", "dest": "bigquery",
                "schedule": "0 4 * * *",
                "transforms": ["calculate_mrr", "compute_churn", "segment"],
            },
            {
                "name": "Support Analytics",
                "source": "zendesk", "dest": "bigquery",
                "schedule": "0 6 * * *",
                "transforms": ["parse_tags", "calculate_sla", "join_agent_data"],
            },
            {
                "name": "User Activity Stream",
                "source": "websocket", "dest": "elasticsearch",
                "schedule": "* * * * *",
                "transforms": ["parse_json", "enrich_user", "extract_metrics"],
            },
            {
                "name": "Ad Spend Sync",
                "source": "google_ads", "dest": "bigquery",
                "schedule": "0 8 * * *",
                "transforms": ["aggregate_by_campaign", "calculate_roas"],
            },
            {
                "name": "Data Lake Ingestion",
                "source": "mysql", "dest": "s3",
                "schedule": "0 3 * * *",
                "transforms": ["incremental_load", "schema_normalization"],
            },
        ]

        for base_config in pipeline_configs:
            for _ in range(count // len(pipeline_configs)):
                dag_type = random.choice(templates["dag_types"])
                dbt_model = random.choice(templates["dbt_models"])

                config = {**base_config}
                config["dag_type"] = dag_type
                config["dbt_model"] = dbt_model

                prompt = (
                    f"Generate a {dag_type} DAG for the '{config['name']}' pipeline. "
                    f"Source: {config['source']}, Destination: {config['dest']}. "
                    f"Schedule: {config['schedule']}. "
                    f"Generate a {dbt_model} dbt model for data transformation."
                )

                # Generate mock code
                dag_code = (
                    f"from datetime import datetime\n"
                    f"from airflow import DAG\n"
                    f"from airflow.operators.python import PythonOperator\n\n"
                    f"default_args = {{\n"
                    f"    'owner': 'aiden',\n"
                    f"    'retries': 3,\n"
                    f"    'retry_delay': timedelta(minutes=5),\n"
                    f"}}\n\n"
                    f"with DAG(\n"
                    f"    '{config['name'].lower().replace(' ', '_')}',\n"
                    f"    default_args=default_args,\n"
                    f"    schedule_interval='{config['schedule']}',\n"
                    f"    start_date=datetime(2026, 1, 1),\n"
                    f"    catchup=False,\n"
                    f") as dag:\n\n"
                    f"    extract_task = PythonOperator(\n"
                    f"        task_id='extract_from_{config['source']}',\n"
                    f"        python_callable=extract_data,\n"
                    f"        op_kwargs={{\n"
                    f"            'source_type': '{config['source']}',\n"
                    f"        }},\n"
                    f"    )\n\n"
                    f"    transform_task = PythonOperator(\n"
                    f"        task_id='transform_data',\n"
                    f"        python_callable=transform_data,\n"
                    f"        op_kwargs={{\n"
                    f"            'transforms': {config['transforms']},\n"
                    f"        }},\n"
                    f"    )\n\n"
                    f"    load_task = PythonOperator(\n"
                    f"        task_id='load_to_{config['dest']}',\n"
                    f"        python_callable=load_data,\n"
                    f"        op_kwargs={{\n"
                    f"            'destination_type': '{config['dest']}',\n"
                    f"        }},\n"
                    f"    )\n\n"
                    f"    extract_task >> transform_task >> load_task\n"
                )

                dbt_code = (
                    f"-- {dbt_model} model for {config['name'].lower()}\n"
                    f"with source as (\n"
                    f"    select * from {{{{ source('{config['source']}', 'raw_{config['name'].lower()}') }}}}\n"
                    f"),\n\n"
                    f"transformed as (\n"
                    f"    select\n"
                    f"        *,\n"
                    f"        current_timestamp as _loaded_at\n"
                    f"    from source\n"
                    f")\n\n"
                    f"select * from transformed\n"
                )

                completion = json.dumps({
                    "dag_code": dag_code,
                    "dbt_code": dbt_code,
                    "config": config,
                    "requires_env": [
                        f"{config['source']}_conn_id",
                        f"{config['dest']}_conn_id",
                    ],
                })

                data.append({"instruction": prompt, "output": completion})

        # Shuffle for variety
        random.shuffle(data)
        return data

    # ── Unified Generator ────────────────────────────────────────────────

    def generate(self, agent_type: str, count: int) -> List[Dict]:
        """Generate synthetic data for the specified agent type."""
        generators = {
            "intent": self.generate_intent,
            "self_healing": self.generate_self_healing,
            "monitoring": self.generate_monitoring,
            "extraction": self.generate_extraction,
            "pipeline_builder": self.generate_pipeline_builder,
        }
        if agent_type not in generators:
            raise ValueError(f"Unknown agent type: {agent_type}. Choose from: {list(generators.keys())}")

        return generators[agent_type](count)

    def save(self, data: List[Dict], output_path: str):
        """Save generated data as JSONL (one JSON object per line)."""
        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            for item in data:
                f.write(json.dumps(item, ensure_ascii=False) + "\n")
        logger.info("Saved %d examples to %s", len(data), output_path)


# ── Ensure safe printing on Windows ───────────────────────────────────────────

def _safe_log(msg: str):
    """Log a message, avoiding UnicodeEncodeError on Windows cp1252 terminals."""
    try:
        msg.encode("cp1252")
        logger.info(msg)
    except (UnicodeEncodeError, UnicodeDecodeError):
        # Strip or replace non-cp1252 characters
        safe = msg.encode("cp1252", errors="replace").decode("cp1252")
        logger.info(safe)


# ═══════════════════════════════════════════════════════════════════════
# LLM-BASED GENERATOR (requires openai package + API key)
# ═══════════════════════════════════════════════════════════════════════

SEED_EXAMPLES = [
    {
        "instruction": "Build a daily sales pipeline from PostgreSQL to Snowflake",
        "output": json.dumps({
            "name": "Daily Sales ETL",
            "source_type": "postgres",
            "source_config": {"table": "sales"},
            "destination_type": "snowflake",
            "destination_config": {"schema": "analytics"},
            "transformations": ["clean", "aggregate_by_region"],
            "schedule": "0 6 * * *",
            "data_quality_rules": ["no_null_primary_key", "amount_positive"],
        }),
    },
    {
        "instruction": "Create an hourly customer analytics pipeline from MySQL to BigQuery",
        "output": json.dumps({
            "name": "Customer Analytics",
            "source_type": "mysql",
            "source_config": {"table": "customers"},
            "destination_type": "bigquery",
            "destination_config": {"dataset": "analytics"},
            "transformations": ["clean", "enrich_customer_data"],
            "schedule": "0 * * * *",
            "data_quality_rules": ["no_duplicate_emails", "email_format_valid"],
        }),
    },
    {
        "instruction": "Build a real-time IoT data pipeline from Kafka to S3",
        "output": json.dumps({
            "name": "IoT Stream Pipeline",
            "source_type": "kafka",
            "source_config": {"topic": "iot_sensors"},
            "destination_type": "s3",
            "destination_config": {"bucket": "iot-data", "format": "parquet"},
            "transformations": ["filter_invalid_readings", "aggregate_by_device"],
            "schedule": "* * * * *",
            "data_quality_rules": ["no_null_timestamps", "device_id_exists"],
        }),
    },
]

LLM_SYSTEM_PROMPT = """You are a data pipeline expert. Generate realistic data pipeline requests and their structured JSON intent.

Each example must be valid JSON with two keys:
- "instruction": A natural language request for a data pipeline
- "output": A JSON string with pipeline metadata:
    name, source_type, source_config, destination_type, destination_config,
    transformations, schedule (cron), data_quality_rules

Cover diverse sources (PostgreSQL, MySQL, Kafka, S3, BigQuery, Snowflake,
Elasticsearch, MongoDB, Redis, Salesforce, APIs, etc.) and diverse purposes
(ETL, streaming, CDC, analytics, ML feature engineering, compliance, etc.).

Return ONLY a JSON array of objects. No markdown, no code fences."""


def generate_with_llm(
    num_examples: int = 20,
    model: str = "gpt-4o-mini",
    api_base: Optional[str] = None,
    api_key: Optional[str] = None,
) -> List[Dict]:
    """Generate examples using an LLM via the OpenAI-compatible API."""
    try:
        from openai import OpenAI
    except ImportError:
        print("❌ openai package not installed. Run: pip install openai")
        sys.exit(1)

    client = OpenAI(
        api_key=api_key or os.getenv("OPENAI_API_KEY"),
        base_url=api_base,
    )

    seed_json = json.dumps(SEED_EXAMPLES, indent=2)
    user_prompt = f"""Generate exactly {num_examples} diverse data pipeline intent examples.
Follow the exact same JSON format as these seed examples:

{seed_json}

Make sure:
- Each instruction is a different, realistic request
- Cover at least 10 different source types
- Include edge cases (very short, very complex, unusual source/dest pairs)
- All output JSON strings are valid JSON
- The schedule field uses valid cron expressions
- Return ONLY a JSON array, nothing else"""

    print(f"🤖 Generating {num_examples} examples with {model}...")
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": LLM_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.8,
        max_tokens=4000,
    )

    content = response.choices[0].message.content
    if not content:
        print("❌ Empty response from model")
        return []

    # Strip markdown code fences if present
    if "```" in content:
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
        content = content.strip()

    try:
        examples = json.loads(content)
        if not isinstance(examples, list):
            examples = [examples]
    except json.JSONDecodeError as exc:
        print(f"❌ Failed to parse model output as JSON: {exc}")
        print(f"Raw output:\n{content[:500]}")
        return []

    # Validate
    valid = []
    for ex in examples:
        if "instruction" in ex and "output" in ex:
            try:
                json.loads(ex["output"])
                valid.append(ex)
            except (json.JSONDecodeError, TypeError):
                logger.warning("Skipping example with invalid output JSON: %s", str(ex.get("instruction", ""))[:60])

    print(f"✅ Generated {len(valid)} valid examples out of {len(examples)}")
    return valid


# ═══════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════

DEFAULT_COUNTS = {
    "intent": 200,
    "self_healing": 150,
    "monitoring": 100,
    "extraction": 80,
    "pipeline_builder": 100,
}


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate synthetic training data for AIDEN agents")

    parser.add_argument(
        "--agent", "-a",
        default="intent",
        choices=["intent", "self_healing", "monitoring", "extraction", "pipeline_builder", "all"],
        help="Agent type to generate data for (default: intent, or 'all' for all 5)",
    )
    parser.add_argument(
        "--count", "-c",
        type=int,
        default=None,
        help="Number of examples (default varies by agent type: 200/150/100/80/100)",
    )
    parser.add_argument(
        "--output", "-o",
        default=None,
        help="Output path (default: data/<agent>_dataset.jsonl)",
    )
    parser.add_argument(
        "--llm",
        action="store_true",
        help="Use LLM (OpenAI) instead of templates (requires OPENAI_API_KEY)",
    )
    parser.add_argument("--model", default="gpt-4o-mini", help="LLM model name (only with --llm)")
    parser.add_argument("--api-base", default=None, help="Custom API base URL (for Ollama, only with --llm)")
    parser.add_argument("--api-key", default=None, help="API key (only with --llm, default: OPENAI_API_KEY env)")

    return parser.parse_args(argv)


def main():
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    args = parse_args()

    if args.agent == "all":
        agents = ["intent", "self_healing", "monitoring", "extraction", "pipeline_builder"]
    else:
        agents = [args.agent]

    if args.llm:
        # LLM mode (only supports intent for now)
        for agent in agents:
            count = args.count or DEFAULT_COUNTS.get(agent, 100)
            output = args.output or f"data/{agent}_dataset.jsonl"
            examples = generate_with_llm(
                num_examples=count,
                model=args.model,
                api_base=args.api_base,
                api_key=args.api_key,
            )
            if examples:
                os.makedirs("data", exist_ok=True)
                with open(output, "w", encoding="utf-8") as f:
                    for ex in examples:
                        f.write(json.dumps(ex, ensure_ascii=False) + "\n")
                print(f"💾 Saved {len(examples)} examples to {output}")
    else:
        # Template mode
        generator = SyntheticDataGenerator()

        for agent in agents:
            count = args.count or DEFAULT_COUNTS.get(agent, 100)
            output = args.output or f"data/{agent}_dataset.jsonl"

            _safe_log(f"Generating {count} {agent} examples -> {output}")
            data = generator.generate(agent, count)
            generator.save(data, output)

    _safe_log("All data generated!")


if __name__ == "__main__":
    main()
