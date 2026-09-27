"""A1 Requirement Agent — synthetic dataset generator.

Generates ~1,050 structurally diverse training examples for the Requirement
Analysis Agent (A1) covering all 20 categories from the Phase 5 plan.

Usage (from repo root):
    python ml/scripts/generate_requirement_dataset.py
    python ml/scripts/generate_requirement_dataset.py --count 2000
    python ml/scripts/generate_requirement_dataset.py --dry-run   # stats only

The script APPENDS to ml/datasets/requirement/raw.jsonl so any hand-crafted
records are preserved. Downstream deduplication (content-hash based) in
`ml/preprocessing/pipeline.py` handles accidental duplicates.

After running this, execute:
    python ml/scripts/prepare_datasets.py --report
to split into train/val/test and verify counts.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
import sys
from pathlib import Path
from typing import Any

ML_DIR = Path(__file__).resolve().parents[1]
RAW_JSONL = ML_DIR / "datasets" / "requirement" / "raw.jsonl"

INSTRUCTION = "Convert the user requirement into a pipeline specification"

# ---------------------------------------------------------------------------
# Source / destination pools
# ---------------------------------------------------------------------------

SOURCES = [
    "postgresql", "mysql", "mongodb", "kafka", "s3", "api", "csv", "json",
    "oracle", "sql_server", "dynamodb", "redis", "salesforce", "hubspot",
    "snowflake", "bigquery", "redshift", "elasticsearch", "clickhouse", "sqlite",
]

DESTINATIONS = [
    "snowflake", "bigquery", "redshift", "s3", "postgresql", "mysql",
    "databricks", "azure_synapse", "clickhouse", "elasticsearch",
    "data_lake", "delta_lake", "hive", "cassandra", "mongodb",
]

ENTITIES = [
    "orders", "customers", "transactions", "events", "sessions", "inventory",
    "products", "payments", "clickstream", "logs", "metrics", "invoices",
    "shipments", "returns", "subscriptions", "users", "pageviews", "leads",
    "contracts", "timesheets", "tickets", "sensor_data", "audit_trail",
    "financial_records", "hr_data", "device_telemetry",
]

SCHEDULES = {
    "real-time": ["real-time", "streaming", "continuously", "as soon as it arrives", "live"],
    "hourly":    ["hourly", "every hour", "each hour", "every 60 minutes"],
    "daily":     ["daily", "every day", "once a day", "each morning", "overnight"],
    "weekly":    ["weekly", "every week", "once a week", "every Monday"],
    "monthly":   ["monthly", "once a month", "at the start of each month"],
}

SCHEDULE_KEYS = list(SCHEDULES.keys())

# Transformation building blocks
TRANSFORMS_POOL: list[tuple[str, str]] = [
    ("mask_pii",            "mask PII"),
    ("filter_nulls",        "filter out null values"),
    ("remove_duplicates",   "remove duplicates"),
    ("enrich_with_reference", "enrich with reference data"),
    ("deduplicate_keys",    "deduplicate by primary key"),
    ("flatten_json",        "flatten nested JSON"),
    ("type_cast",           "cast column types"),
    ("normalize_timestamps", "normalize timestamps to UTC"),
    ("hash_sensitive_columns", "hash sensitive columns"),
    ("apply_business_rules", "apply business validation rules"),
    ("aggregate_by_day",    "aggregate by day"),
    ("calculate_metrics",   "calculate derived metrics"),
    ("add_ingestion_timestamp", "add ingestion timestamp"),
    ("schema_validation",   "validate against schema"),
    ("data_quality_checks", "run data quality checks"),
    ("incremental_watermark", "apply incremental watermark"),
    ("partition_by_date",   "partition output by date"),
    ("sort_by_timestamp",   "sort records by timestamp"),
    ("join_dimension_table", "join with dimension table"),
    ("scd_type2",           "apply SCD Type 2 slowly changing dimensions"),
]


# ---------------------------------------------------------------------------
# Category definitions — each category has:
#   key          – metadata.category
#   weight       – approximate share of total examples
#   src_filter   – restrict sources (None = all)
#   dst_filter   – restrict destinations (None = all)
#   schedules    – forced schedule keys (None = random)
#   transforms   – forced transform keys (None = random subset from pool)
#   templates    – list of input sentence templates
# ---------------------------------------------------------------------------

Category = dict[str, Any]

CATEGORIES: list[Category] = [
    # ---------------------------------------------------------------- ETL/ELT
    {
        "key": "postgresql_to_snowflake",
        "weight": 60,
        "src_filter": ["postgresql"],
        "dst_filter": ["snowflake"],
        "schedules": None,
        "transforms": None,
        "templates": [
            "Create a {schedule_adj} {entity} pipeline from PostgreSQL to Snowflake",
            "Build a {schedule_adj} pipeline that moves {entity} data from PostgreSQL into Snowflake",
            "Set up a {schedule_adj} ETL job to sync {entity} from our PostgreSQL database to Snowflake",
            "I need a {schedule_adj} pipeline that extracts {entity} from PostgreSQL and loads it to Snowflake",
            "Configure a {schedule_adj} data flow for {entity} from PostgreSQL to our Snowflake warehouse",
        ],
    },
    {
        "key": "mysql_to_bigquery",
        "weight": 55,
        "src_filter": ["mysql"],
        "dst_filter": ["bigquery"],
        "schedules": None,
        "transforms": None,
        "templates": [
            "Create a {schedule_adj} {entity} pipeline from MySQL to BigQuery",
            "Build a {schedule_adj} data pipeline extracting {entity} from MySQL and loading to BigQuery",
            "Set up a MySQL to BigQuery pipeline for {entity} running {schedule_adj}",
            "I want to move {entity} from MySQL to Google BigQuery {schedule_adj}",
            "Migrate {entity} data from MySQL to BigQuery on a {schedule_adj} schedule",
        ],
    },
    {
        "key": "postgresql_to_s3",
        "weight": 50,
        "src_filter": ["postgresql"],
        "dst_filter": ["s3"],
        "schedules": None,
        "transforms": None,
        "templates": [
            "Export {entity} from PostgreSQL to S3 {schedule_adj}",
            "Create a {schedule_adj} pipeline to dump {entity} from PostgreSQL to S3",
            "Set up a {schedule_adj} extract of {entity} from PostgreSQL into Amazon S3",
            "Build a {schedule_adj} archival pipeline moving {entity} from PostgreSQL to S3",
            "Configure a PostgreSQL to S3 export for {entity} running {schedule_adj}",
        ],
    },
    {
        "key": "api_to_postgresql",
        "weight": 55,
        "src_filter": ["api", "salesforce", "hubspot"],
        "dst_filter": ["postgresql", "mysql"],
        "schedules": None,
        "transforms": None,
        "templates": [
            "Ingest {entity} from an API into PostgreSQL {schedule_adj}",
            "Create a {schedule_adj} pipeline that pulls {entity} from a REST API and stores them in PostgreSQL",
            "Set up {schedule_adj} ingestion of {entity} from our API into the PostgreSQL database",
            "Build a {schedule_adj} API ingestion job for {entity} into PostgreSQL",
            "Pull {entity} from our API {schedule_adj} and persist to PostgreSQL",
        ],
    },
    {
        "key": "csv_to_warehouse",
        "weight": 55,
        "src_filter": ["csv", "s3"],
        "dst_filter": ["snowflake", "bigquery", "redshift"],
        "schedules": None,
        "transforms": None,
        "templates": [
            "Load {entity} CSV files into the data warehouse {schedule_adj}",
            "Create a {schedule_adj} pipeline that reads {entity} from CSV and loads to {destination}",
            "Build a {schedule_adj} CSV ingestion pipeline for {entity} into {destination}",
            "Set up {schedule_adj} import of {entity} CSV exports into {destination}",
            "Configure a {schedule_adj} CSV-to-warehouse pipeline for {entity} targeting {destination}",
        ],
    },
    {
        "key": "json_to_warehouse",
        "weight": 50,
        "src_filter": ["json", "s3", "api"],
        "dst_filter": ["snowflake", "bigquery", "redshift", "clickhouse"],
        "schedules": None,
        "transforms": ["flatten_json", "type_cast", "add_ingestion_timestamp"],
        "templates": [
            "Ingest {entity} from JSON files into {destination} {schedule_adj}",
            "Build a {schedule_adj} JSON ingestion pipeline that writes {entity} into {destination}",
            "Create a {schedule_adj} pipeline to parse {entity} JSON and load into {destination}",
            "Set up {schedule_adj} JSON data loading for {entity} from our API into {destination}",
            "Configure {schedule_adj} ingestion of nested {entity} JSON into {destination}",
        ],
    },
    # ---------------------------------------------------------------- Streaming
    {
        "key": "kafka_to_snowflake",
        "weight": 60,
        "src_filter": ["kafka"],
        "dst_filter": ["snowflake", "bigquery", "clickhouse"],
        "schedules": ["real-time"],
        "transforms": None,
        "templates": [
            "Create a real-time {entity} pipeline from Kafka to {destination}",
            "Stream {entity} events from Kafka into {destination} in real time",
            "Set up a Kafka consumer that writes {entity} to {destination} continuously",
            "Build a streaming pipeline for {entity} from Kafka to {destination}",
            "Consume {entity} from our Kafka topic and sink to {destination} in real time",
        ],
    },
    {
        "key": "streaming",
        "weight": 60,
        "src_filter": ["kafka", "dynamodb", "redis"],
        "dst_filter": ["snowflake", "bigquery", "elasticsearch", "clickhouse"],
        "schedules": ["real-time"],
        "transforms": None,
        "templates": [
            "Build a real-time streaming pipeline for {entity} from {source} to {destination}",
            "Create a low-latency {entity} pipeline from {source} to {destination}",
            "Stream {entity} from {source} to {destination} with sub-second latency",
            "Set up real-time ingestion of {entity} from {source} into {destination}",
            "Configure a streaming {entity} pipeline from {source} landing in {destination}",
        ],
    },
    # ---------------------------------------------------------------- CDC
    {
        "key": "cdc",
        "weight": 55,
        "src_filter": ["postgresql", "mysql", "oracle", "sql_server"],
        "dst_filter": ["snowflake", "bigquery", "redshift", "kafka"],
        "schedules": ["real-time", "hourly"],
        "transforms": ["incremental_watermark", "add_ingestion_timestamp"],
        "templates": [
            "Set up CDC for {entity} from {source} to {destination}",
            "Capture change data for {entity} from {source} and replicate to {destination}",
            "Build a CDC pipeline that tracks {entity} changes in {source} and streams to {destination}",
            "Create a change data capture pipeline for {entity} from {source} to {destination}",
            "Implement CDC-based replication of {entity} from {source} into {destination}",
        ],
    },
    # ---------------------------------------------------------------- Batch
    {
        "key": "batch_etl",
        "weight": 60,
        "src_filter": None,
        "dst_filter": None,
        "schedules": ["daily", "weekly", "monthly"],
        "transforms": None,
        "templates": [
            "Create a {schedule_adj} batch ETL pipeline for {entity} from {source} to {destination}",
            "Build a {schedule_adj} batch job that extracts {entity} from {source} and loads into {destination}",
            "Set up a {schedule_adj} ETL for {entity} going from {source} to {destination}",
            "Design a {schedule_adj} batch pipeline for {entity} from {source} to {destination}",
            "Run a {schedule_adj} batch ETL moving {entity} from {source} to {destination}",
        ],
    },
    {
        "key": "batch_elt",
        "weight": 55,
        "src_filter": None,
        "dst_filter": ["snowflake", "bigquery", "redshift", "databricks"],
        "schedules": ["daily", "weekly"],
        "transforms": ["schema_validation", "data_quality_checks"],
        "templates": [
            "Create a {schedule_adj} batch ELT pipeline for {entity} from {source} to {destination}",
            "Build a {schedule_adj} ELT job that loads {entity} from {source} raw into {destination} then transforms",
            "Set up a {schedule_adj} ELT for {entity} loading raw from {source} into {destination}",
            "Design a {schedule_adj} ELT workflow for {entity} — raw load from {source} to {destination}",
            "Configure a {schedule_adj} ELT pipeline for {entity} landing raw in {destination} from {source}",
        ],
    },
    # ---------------------------------------------------------------- Orchestration + processing
    {
        "key": "airflow",
        "weight": 50,
        "src_filter": None,
        "dst_filter": None,
        "schedules": ["daily", "weekly", "hourly"],
        "transforms": None,
        "templates": [
            "Create an Airflow DAG for {entity} pipeline from {source} to {destination} running {schedule_adj}",
            "Build a {schedule_adj} Airflow pipeline that moves {entity} from {source} to {destination}",
            "Set up an Airflow-orchestrated {entity} pipeline from {source} to {destination} — {schedule_adj}",
            "Design an Airflow DAG to orchestrate {entity} ETL from {source} to {destination} {schedule_adj}",
            "Configure an Airflow {schedule_adj} workflow for {entity} from {source} to {destination}",
        ],
    },
    {
        "key": "spark",
        "weight": 50,
        "src_filter": ["s3", "kafka", "hdfs", "postgresql"],
        "dst_filter": ["snowflake", "bigquery", "s3", "delta_lake", "databricks"],
        "schedules": ["daily", "hourly", "real-time"],
        "transforms": ["aggregate_by_day", "calculate_metrics"],
        "templates": [
            "Build a Spark pipeline for {entity} from {source} to {destination} running {schedule_adj}",
            "Create a {schedule_adj} Spark job that processes {entity} from {source} and writes to {destination}",
            "Set up a Spark-based {entity} pipeline from {source} to {destination}",
            "Design a {schedule_adj} Spark batch pipeline for {entity} from {source} into {destination}",
            "Run a Spark processing job for {entity} from {source} to {destination} {schedule_adj}",
        ],
    },
    {
        "key": "dbt",
        "weight": 50,
        "src_filter": ["snowflake", "bigquery", "redshift", "postgresql"],
        "dst_filter": ["snowflake", "bigquery", "redshift"],
        "schedules": ["daily", "hourly"],
        "transforms": ["apply_business_rules", "scd_type2", "calculate_metrics"],
        "templates": [
            "Create a dbt pipeline for {entity} from {source} to {destination} running {schedule_adj}",
            "Build {schedule_adj} dbt models to transform {entity} in {destination} from {source}",
            "Set up a dbt transformation for {entity} sourced from {source} targeting {destination}",
            "Configure dbt to transform {entity} data from {source} into clean tables in {destination}",
            "Design a dbt workflow for {entity} — source from {source}, write to {destination}",
        ],
    },
    # ---------------------------------------------------------------- Data quality + governance
    {
        "key": "schema_drift",
        "weight": 50,
        "src_filter": None,
        "dst_filter": None,
        "schedules": ["real-time", "hourly", "daily"],
        "transforms": ["schema_validation", "data_quality_checks", "add_ingestion_timestamp"],
        "templates": [
            "Create a {schedule_adj} pipeline for {entity} from {source} to {destination} with schema drift detection",
            "Build a {schedule_adj} {entity} pipeline from {source} to {destination} that handles schema changes",
            "Set up {schedule_adj} ingestion of {entity} from {source} to {destination} with schema evolution support",
            "Configure a {schedule_adj} pipeline for {entity} from {source} that detects and handles schema drift",
            "Design a {schedule_adj} {entity} pipeline from {source} to {destination} robust to schema changes",
        ],
    },
    {
        "key": "data_quality",
        "weight": 55,
        "src_filter": None,
        "dst_filter": None,
        "schedules": ["daily", "hourly"],
        "transforms": ["data_quality_checks", "schema_validation", "filter_nulls"],
        "templates": [
            "Build a {schedule_adj} {entity} pipeline from {source} to {destination} with data quality checks",
            "Create a {schedule_adj} pipeline for {entity} from {source} to {destination} including DQ validation",
            "Set up {schedule_adj} quality-gated ingestion of {entity} from {source} into {destination}",
            "Configure a {schedule_adj} {entity} pipeline from {source} to {destination} with automated quality gates",
            "Design a {schedule_adj} pipeline for {entity} from {source} to {destination} — enforce DQ rules",
        ],
    },
    {
        "key": "pii",
        "weight": 55,
        "src_filter": None,
        "dst_filter": ["snowflake", "bigquery", "redshift", "s3"],
        "schedules": None,
        "transforms": ["mask_pii", "hash_sensitive_columns"],
        "templates": [
            "Create a {schedule_adj} {entity} pipeline from {source} to {destination} with PII masking",
            "Build a {schedule_adj} pipeline for {entity} from {source} to {destination} — mask all PII fields",
            "Set up {schedule_adj} ingestion of {entity} from {source} to {destination} with PII anonymization",
            "Configure a GDPR-compliant {schedule_adj} pipeline for {entity} from {source} to {destination}",
            "Build a {schedule_adj} {entity} pipeline from {source} to {destination} hashing sensitive columns",
        ],
    },
    # ---------------------------------------------------------------- Incremental + scheduling
    {
        "key": "incremental_loads",
        "weight": 55,
        "src_filter": None,
        "dst_filter": None,
        "schedules": ["hourly", "daily"],
        "transforms": ["incremental_watermark", "add_ingestion_timestamp"],
        "templates": [
            "Create an incremental {schedule_adj} pipeline for {entity} from {source} to {destination}",
            "Build a {schedule_adj} incremental load pipeline for {entity} from {source} into {destination}",
            "Set up {schedule_adj} incremental ingestion of {entity} from {source} to {destination}",
            "Configure a {schedule_adj} watermark-based pipeline for {entity} from {source} to {destination}",
            "Design an incremental {schedule_adj} {entity} pipeline from {source} — append only to {destination}",
        ],
    },
    {
        "key": "scheduling",
        "weight": 50,
        "src_filter": None,
        "dst_filter": None,
        "schedules": None,
        "transforms": None,
        "templates": [
            "Schedule a {schedule_adj} {entity} pipeline from {source} to {destination}",
            "Run a {schedule_adj} {entity} pipeline from {source} to {destination}",
            "Execute a {schedule_adj} data job for {entity} from {source} to {destination}",
            "Set the {entity} pipeline from {source} to {destination} to run {schedule_adj}",
            "Trigger a {entity} extract from {source} to {destination} {schedule_adj}",
        ],
    },
    {
        "key": "monitoring_failure_handling",
        "weight": 50,
        "src_filter": None,
        "dst_filter": None,
        "schedules": None,
        "transforms": None,
        "monitoring_forced": True,
        "templates": [
            "Create a {schedule_adj} monitored {entity} pipeline from {source} to {destination} with failure alerts",
            "Build a {schedule_adj} {entity} pipeline from {source} to {destination} — alert me on failure",
            "Set up a {schedule_adj} {entity} pipeline from {source} to {destination} with monitoring and alerting",
            "Configure a {schedule_adj} {entity} pipeline from {source} to {destination} — notify on failure",
            "Design a {schedule_adj} {entity} pipeline from {source} to {destination} with SLA monitoring",
        ],
    },
]


def _pick(pool: list, rng: random.Random) -> str:
    return rng.choice(pool)


def _random_transforms(
    forced_keys: list[str] | None,
    rng: random.Random,
    n_min: int = 1,
    n_max: int = 4,
) -> tuple[list[str], list[str]]:
    """Return (transform_keys, transform_phrases)."""
    if forced_keys:
        pool = [(k, p) for k, p in TRANSFORMS_POOL if k in forced_keys]
        if not pool:
            pool = TRANSFORMS_POOL
        chosen = pool
    else:
        n = rng.randint(n_min, n_max)
        chosen = rng.sample(TRANSFORMS_POOL, min(n, len(TRANSFORMS_POOL)))
    keys = [k for k, _ in chosen]
    phrases = [p for _, p in chosen]
    return keys, phrases


def _monitoring_from_template(template: str, forced: bool) -> tuple[bool, bool]:
    """Derive monitoring/failure_notification from template text heuristics."""
    if forced:
        return True, True
    t = template.lower()
    monitoring = any(w in t for w in ["monitor", "alert", "notify", "notification", "sla", "failure"])
    failure_notification = any(w in t for w in ["notify", "notification", "alert", "failure"])
    return monitoring, failure_notification


def _difficulty(n_transforms: int) -> str:
    if n_transforms <= 1:
        return "easy"
    if n_transforms <= 3:
        return "medium"
    return "hard"


def _schedule_adj(schedule_key: str, rng: random.Random) -> str:
    return rng.choice(SCHEDULES[schedule_key])


def _src_pool(cat: Category) -> list[str]:
    f = cat.get("src_filter")
    if f:
        return [s for s in f if s in SOURCES + ["hdfs"]]
    return SOURCES


def _dst_pool(cat: Category) -> list[str]:
    f = cat.get("dst_filter")
    if f:
        return [d for d in f if d in DESTINATIONS]
    return DESTINATIONS


def generate_example(
    cat: Category,
    rng: random.Random,
) -> dict[str, Any]:
    src_pool = _src_pool(cat)
    dst_pool = _dst_pool(cat)

    source = _pick(src_pool, rng)
    destination = _pick(dst_pool, rng)
    # Avoid self-loops
    while destination == source and len(dst_pool) > 1:
        destination = _pick(dst_pool, rng)

    entity = _pick(ENTITIES, rng)
    sched_key = _pick(cat["schedules"] or SCHEDULE_KEYS, rng)
    sched_word = _schedule_adj(sched_key, rng)

    template: str = _pick(cat["templates"], rng)
    forced_monitoring = cat.get("monitoring_forced", False)

    transforms_forced = cat.get("transforms")
    transform_keys, transform_phrases = _random_transforms(transforms_forced, rng)

    # decide whether to mention transforms in the input text
    mention_transforms = rng.random() > 0.3
    monitoring, failure_notification = _monitoring_from_template(template, forced_monitoring)

    # random chance to add notification clause even if not in template
    if not failure_notification and rng.random() > 0.6:
        failure_notification = True
        monitoring = True

    # build input sentence
    input_text = template.format(
        schedule_adj=sched_word,
        entity=entity,
        source=source,
        destination=destination,
    )
    if mention_transforms and transform_phrases:
        connector = rng.choice([", ", " and ", "; "])
        suffix_parts = rng.sample(transform_phrases, min(len(transform_phrases), rng.randint(1, 3)))
        input_text = input_text.rstrip(".") + connector + ", ".join(suffix_parts)
    if failure_notification and "notify" not in input_text.lower() and "alert" not in input_text.lower():
        input_text = input_text.rstrip(".") + " and notify me if it fails"

    return {
        "agent": "requirement_analysis",
        "instruction": INSTRUCTION,
        "input": input_text,
        "expected_output": {
            "source": source,
            "destination": destination,
            "schedule": sched_key,
            "transformations": transform_keys,
            "monitoring": monitoring or failure_notification,
            "failure_notification": failure_notification,
        },
        "metadata": {
            "category": cat["key"],
            "difficulty": _difficulty(len(transform_keys)),
            "source": "synthetic",
        },
    }


def generate(total: int = 1050, seed: int = 42) -> list[dict[str, Any]]:
    """Generate `total` examples proportionally across categories."""
    rng = random.Random(seed)
    total_weight = sum(c["weight"] for c in CATEGORIES)

    examples: list[dict[str, Any]] = []
    for cat in CATEGORIES:
        count = round(total * cat["weight"] / total_weight)
        for _ in range(count):
            examples.append(generate_example(cat, rng))

    # trim / top-up to exact total
    rng.shuffle(examples)
    examples = examples[:total]

    return examples


def _content_key(rec: dict[str, Any]) -> str:
    basis = json.dumps(
        {k: rec.get(k) for k in ("agent", "instruction", "input") if rec.get(k) is not None},
        sort_keys=True,
        ensure_ascii=False,
    )
    return hashlib.sha256(basis.encode()).hexdigest()


def append_to_raw(
    examples: list[dict[str, Any]],
    raw_path: Path,
) -> tuple[int, int]:
    """Append new examples to raw.jsonl, skipping duplicates already present.

    Returns (written, skipped).
    """
    existing_keys: set[str] = set()
    if raw_path.exists():
        with raw_path.open(encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if line:
                    try:
                        rec = json.loads(line)
                        existing_keys.add(_content_key(rec))
                    except json.JSONDecodeError:
                        pass

    written = skipped = 0
    with raw_path.open("a", encoding="utf-8") as fh:
        for ex in examples:
            key = _content_key(ex)
            if key in existing_keys:
                skipped += 1
                continue
            fh.write(json.dumps(ex, ensure_ascii=False) + "\n")
            existing_keys.add(key)
            written += 1
    return written, skipped


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="generate_requirement_dataset",
        description="Generate synthetic A1 Requirement Agent training examples",
    )
    parser.add_argument(
        "--count", type=int, default=1050,
        help="Total number of examples to generate (default: 1050)",
    )
    parser.add_argument(
        "--seed", type=int, default=42,
        help="Random seed for reproducibility (default: 42)",
    )
    parser.add_argument(
        "--output", type=Path, default=RAW_JSONL,
        help=f"Output JSONL file (default: {RAW_JSONL})",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Generate and print stats without writing to disk",
    )
    args = parser.parse_args(argv)

    print(f"[generate] Generating {args.count} examples (seed={args.seed}) …")
    examples = generate(total=args.count, seed=args.seed)

    # Per-category stats
    from collections import Counter
    cats = Counter(ex["metadata"]["category"] for ex in examples)
    diffs = Counter(ex["metadata"]["difficulty"] for ex in examples)
    scheds = Counter(ex["expected_output"]["schedule"] for ex in examples)
    print(f"[generate] Categories:   {dict(sorted(cats.items(), key=lambda x: -x[1]))}")
    print(f"[generate] Difficulties: {dict(diffs)}")
    print(f"[generate] Schedules:    {dict(scheds)}")
    monitoring_count = sum(1 for ex in examples if ex["expected_output"]["monitoring"])
    notify_count = sum(1 for ex in examples if ex["expected_output"]["failure_notification"])
    print(f"[generate] monitoring=True: {monitoring_count}  failure_notification=True: {notify_count}")

    if args.dry_run:
        print("[generate] Dry run — nothing written.")
        return 0

    args.output.parent.mkdir(parents=True, exist_ok=True)
    written, skipped = append_to_raw(examples, args.output)
    print(f"[generate] Written: {written}  Skipped (duplicates): {skipped}")
    print(f"[generate] Output: {args.output}")
    print()
    print("Next steps:")
    print("  python ml/scripts/prepare_datasets.py --source backend-scaffold")
    print("  — or to split only the requirement agent without touching other agents:")
    print()
    print("  python -c \"")
    print("  import json, sys")
    print("  from pathlib import Path")
    print("  ML = Path('ml')")
    print("  sys.path.insert(0, '.')")
    print("  from ml.preprocessing.pipeline import prepare_agent_dir")
    print("  contracts = json.loads((ML / 'agents.json').read_text())")
    print("  schema = next(a['output_schema'] for a in contracts['agents'] if a['backend_agent']=='requirement_analysis')")
    print("  stats = prepare_agent_dir(ML / 'datasets' / 'requirement', schema=schema)")
    print("  print(stats)\"")
    return 0


if __name__ == "__main__":
    sys.exit(main())
