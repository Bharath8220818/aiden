"""Dataset builder — deterministic generators + JSONL I/O.

`generate_seed_dataset()` produces schema-valid starter samples for every
agent (a handful each, deterministic under a fixed seed) so the eval
pipeline, tests, and future annotation runs start from a real scaffold.
Scale targets live in `schema.AGENT_SAMPLE_TARGETS` (500/300/200 per the
recommended experiment plan).
"""

from __future__ import annotations

import json
import random
from collections.abc import Callable, Iterator
from pathlib import Path
from typing import Any

from app.ai.datasets.schema import AGENT_SAMPLE_TARGETS, DATASET_VERSION, DatasetRecord

DATA_DIR = Path(__file__).resolve().parents[3] / "data" / "datasets"
SEED = 42

_SOURCES = ["postgresql", "mysql", "mongodb", "kafka", "s3", "api_rest", "salesforce"]
_DESTINATIONS = ["snowflake", "bigquery", "redshift", "postgres_warehouse", "databricks_delta"]
_SCHEDULES = ["daily", "hourly", "every 15 minutes", "weekly", "real-time"]
_TRANSFORMS = [
    "remove_duplicates",
    "mask_pii",
    "cast_types",
    "deduplicate_keys",
    "enrich_with_reference",
    "filter_nulls",
]
_TOPICS = ["orders", "customers", "payments", "clickstream", "inventory", "sessions", "invoices", "shipments"]
_ENGINES = ["spark", "dbt", "python", "airflow"]
_SQL_JOBS = ["generate", "explain", "optimize", "fix", "convert"]
_CODE_TARGETS = ["airflow_dag", "python_etl", "dbt_model", "spark_job"]
_FAILURES = [
    ("schema", "source column {col} changed from INTEGER to STRING"),
    ("uniqueness", "duplicate {col} values violated the uniqueness gate"),
    ("nullrate", "null rate on {col} exceeded the 5% threshold"),
    ("connection", "source connection timed out after 30s during extract"),
    ("volume", "row count dropped 80% vs the 7-day average"),
]
_COLS = ["customer_id", "order_id", "event_ts", "amount", "email"]
_TASK_TYPES = {
    "extract": "postgres_extract",
    "validate_raw": "dq_checks",
    "transform": "spark_transform",
    "load": "snowflake_load",
    "validate_final": "dq_checks",
    "notify": "slack_alert",
}


# --------------------------------------------------------------------------- #
# Per-agent generators
# --------------------------------------------------------------------------- #
def _req_spec(rng: random.Random) -> tuple[str, dict]:
    src, dst = rng.choice(_SOURCES), rng.choice(_DESTINATIONS)
    sched = rng.choice(_SCHEDULES)
    transforms = rng.sample(_TRANSFORMS, k=rng.randint(1, 3))
    monitoring = rng.random() < 0.7
    topic = rng.choice(_TOPICS)
    transform_txt = "" if not transforms else ", " + ", ".join(t.replace("_", " ") for t in transforms)
    text = (
        f"Create a {sched} {topic} pipeline from {src.replace('_', ' ')} to "
        f"{dst.replace('_', ' ')}" + transform_txt + (" and notify me if it fails" if monitoring else "")
    )
    spec = {
        "source": src,
        "destination": dst,
        "schedule": sched,
        "transformations": transforms,
        "monitoring": monitoring,
        "failure_notification": monitoring,
    }
    return text, spec


def _gen_requirement_analysis(rng: random.Random) -> DatasetRecord:
    text, spec = _req_spec(rng)
    return DatasetRecord(
        agent="requirement_analysis",
        instruction="Convert the user requirement into a pipeline specification",
        input=text,
        output=spec,
    )


def _gen_vision_requirement(rng: random.Random) -> DatasetRecord:
    n = rng.randint(3, 5)
    picks = rng.sample(list(_TASK_TYPES.items()), k=min(n, len(_TASK_TYPES)))
    nodes = [{"type": t, "name": tid.replace("_", " ").title()} for tid, t in picks]
    names = [nd["name"] for nd in nodes]
    conns = [[names[i], names[i + 1]] for i in range(len(names) - 1)]
    image = f"diagram_{rng.randint(1, 999):03d}.png"
    return DatasetRecord(
        agent="vision_requirement",
        instruction="Extract all data engineering components and connections",
        input="Architecture diagram image",
        output={"nodes": nodes, "connections": conns},
        image=image,
    )


def _gen_audio_requirement(rng: random.Random) -> DatasetRecord:
    text, spec = _req_spec(rng)
    return DatasetRecord(
        agent="audio_requirement",
        instruction="Convert the spoken requirement (Whisper transcript) into a pipeline specification",
        input=text,
        output=spec,
    )


def _gen_architecture(rng: random.Random) -> DatasetRecord:
    src, dst = rng.choice(_SOURCES), rng.choice(_DESTINATIONS)
    engine = rng.choice(_ENGINES)
    spec_in = {"source": src, "destination": dst, "processing": engine, "schedule": rng.choice(_SCHEDULES)}
    arch = {
        "architecture": {"source": src, "processing": engine, "destination": dst},
        "components": [
            {"type": "database", "name": src},
            {"type": "processing", "name": engine},
            {"type": "warehouse", "name": dst},
        ],
        "connections": [[src, engine], [engine, dst]],
    }
    return DatasetRecord(
        agent="architecture",
        instruction="Derive the target architecture from the pipeline specification",
        input=json.dumps(spec_in),
        output=arch,
    )


def _gen_planning(rng: random.Random) -> DatasetRecord:
    src, dst = rng.choice(_SOURCES), rng.choice(_DESTINATIONS)
    ids = list(_TASK_TYPES)
    tasks = [
        {"id": tid, "type": ttype}
        for tid, ttype in _TASK_TYPES.items()
        if rng.random() < 0.85 or tid in {"extract", "transform", "load"}
    ]
    deps = [[ids[i], ids[i + 1]] for i in range(len(ids) - 1) if any(t["id"] == ids[i + 1] for t in tasks)]
    return DatasetRecord(
        agent="pipeline_planning",
        instruction="Plan the pipeline task DAG for the architecture",
        input=json.dumps({"source": src, "destination": dst}),
        output={"tasks": tasks, "dependencies": deps},
    )


def _gen_sql_data(rng: random.Random) -> DatasetRecord:
    job = rng.choice(_SQL_JOBS)
    col, topic = rng.choice(_COLS), rng.choice(_TOPICS)
    sql = {
        "generate": f"SELECT {col}, COUNT(*) AS n FROM {topic} GROUP BY {col} ORDER BY n DESC;",
        "explain": f"EXPLAIN ANALYZE SELECT * FROM {topic} WHERE created_at >= NOW() - INTERVAL '7 days';",
        "optimize": f"CREATE INDEX idx_{topic}_{col} ON {topic} ({col});",
        "fix": f"SELECT * FROM {topic} WHERE {col} IS NOT NULL;",
        "convert": f"SELECT CAST({col} AS VARCHAR) AS {col}_text FROM {topic};",
    }[job]
    return DatasetRecord(
        agent="sql_data",
        instruction=f"{job.capitalize()} SQL for the analyst request",
        input=f"Schema: {topic}({', '.join(rng.sample(_COLS, k=4))}). Request: {job} query on {col}",
        output={"sql": sql, "dialect": "postgresql"},
    )


def _gen_pipeline_code(rng: random.Random) -> DatasetRecord:
    src, dst = rng.choice(_SOURCES), rng.choice(_DESTINATIONS)
    target = rng.choice(_CODE_TARGETS)
    dag_id = f"{src}_to_{dst}_{rng.choice(['daily', 'hourly', 'cdc'])}"
    code = (
        f"from airflow import DAG\nfrom datetime import datetime\n\n"
        f"with DAG(dag_id='{dag_id}', start_date=datetime(2024, 1, 1), schedule='@daily') as dag:\n"
        f"    extract = PythonOperator(task_id='extract', python_callable=extract_{src})\n"
        f"    load = PythonOperator(task_id='load', python_callable=load_{dst})\n"
        f"    extract >> load\n"
    )
    return DatasetRecord(
        agent="pipeline_code",
        instruction=f"Generate {target.replace('_', ' ')} code for the pipeline specification",
        input=json.dumps({"source": src, "destination": dst, "schedule": "daily", "engine": target}),
        output={"language": "python", "framework": target, "code": code},
    )


def _gen_validation(rng: random.Random) -> DatasetRecord:
    if rng.random() < 0.5:
        bad_dep = [["load_sales", "transform_sales"]]
        return DatasetRecord(
            agent="validation",
            instruction="Validate the pipeline DAG and report structural errors",
            input=json.dumps({"tasks": [{"id": "extract"}, {"id": "load_sales"}], "dependencies": bad_dep}),
            output={
                "valid": False,
                "errors": [
                    {
                        "type": "dependency",
                        "message": "Task load_sales depends on undefined task transform_sales",
                    }
                ],
            },
        )
    return DatasetRecord(
        agent="validation",
        instruction="Validate the pipeline DAG",
        input=json.dumps(
            {"tasks": [{"id": "extract"}, {"id": "load"}], "dependencies": [["extract", "load"]]}
        ),
        output={"valid": True, "errors": []},
    )


def _gen_monitoring_rca(rng: random.Random) -> DatasetRecord:
    kind, cause = rng.choice(_FAILURES)
    col = rng.choice(_COLS)
    cause_txt = cause.format(col=col)
    return DatasetRecord(
        agent="monitoring_rca",
        instruction="Diagnose the pipeline failure from logs, metrics, schema and past incidents",
        input=json.dumps(
            {"pipeline": f"{rng.choice(_TOPICS)}_daily", "logs": f"ERROR: {cause_txt}", "task": "transform"}
        ),
        output={
            "root_cause": cause_txt,
            "confidence": round(rng.uniform(0.75, 0.97), 2),
            "affected_task": "transform",
            "recommended_action": f"inspect {col} mapping and re-run",
        },
    )


def _gen_self_healing(rng: random.Random) -> DatasetRecord:
    kind, cause = rng.choice(_FAILURES)
    col = rng.choice(_COLS)
    cause_txt = cause.format(col=col)
    patch = f"-    df = df.withColumn('{col}', df['{col}'])\n+    df = df.withColumn('{col}', df['{col}'].cast('string'))\n"
    return DatasetRecord(
        agent="self_healing",
        instruction="Propose a repair patch for the diagnosed failure",
        input=cause_txt,
        output={"patch_summary": f"cast {col} to match the upstream type"},
        failure=cause_txt,
        logs=f"[ERROR] transform task failed: {cause_txt}",
        root_cause=cause_txt,
        patch=patch,
        test_result=rng.choice(["passed", "passed", "passed", "failed"]),
    )


def _gen_documentation_knowledge(rng: random.Random) -> DatasetRecord:
    topic = rng.choice(_TOPICS)
    src, dst = rng.choice(_SOURCES), rng.choice(_DESTINATIONS)
    kind = rng.choice(["pipeline_documentation", "incident_summary", "data_dictionary"])
    doc = {
        "pipeline_documentation": f"# {topic} pipeline\n\nMoves {topic} from {src} to {dst} on a daily schedule with duplicate-key and PII-masking checks.",
        "incident_summary": f"## Incident: {topic}_daily quality gate\n\nUniqueness check on customer_id failed after an upstream schema change; records were quarantined and reprocessed after a type cast patch.",
        "data_dictionary": f"# {topic} data dictionary\n\n- {rng.choice(_COLS)}: primary key\n- amount: decimal(12,2)\n- event_ts: timestamptz\n- email: masked PII",
    }[kind]
    return DatasetRecord(
        agent="documentation_knowledge",
        instruction=f"Produce {kind.replace('_', ' ')} for the pipeline",
        input=json.dumps({"pipeline": f"{topic}_daily", "source": src, "destination": dst, "kind": kind}),
        output={"document": doc},
    )


_GENERATORS: dict[str, Callable[[random.Random], DatasetRecord]] = {
    "requirement_analysis": _gen_requirement_analysis,
    "vision_requirement": _gen_vision_requirement,
    "audio_requirement": _gen_audio_requirement,
    "architecture": _gen_architecture,
    "pipeline_planning": _gen_planning,
    "sql_data": _gen_sql_data,
    "pipeline_code": _gen_pipeline_code,
    "validation": _gen_validation,
    "monitoring_rca": _gen_monitoring_rca,
    "self_healing": _gen_self_healing,
    "documentation_knowledge": _gen_documentation_knowledge,
}


# --------------------------------------------------------------------------- #
# Public API
# --------------------------------------------------------------------------- #
def generate_seed_dataset(per_agent: int = 5, *, seed: int = SEED) -> list[DatasetRecord]:
    """Deterministic starter set: `per_agent` samples for each of the 11 agents."""
    records: list[DatasetRecord] = []
    for agent_id in AGENT_SAMPLE_TARGETS:
        rng = random.Random(f"{seed}:{agent_id}")  # per-agent streams stay stable
        gen = _GENERATORS[agent_id]
        records.extend(gen(rng) for _ in range(per_agent))
    return records


def build_for_agent(agent_id: str, count: int | None = None, *, seed: int = SEED) -> list[DatasetRecord]:
    """Generate `count` (default: the experiment target) samples for one agent.

    NOTE: these are synthetic scaffold samples. Real eval runs should replace
    them with annotated samples before publishing accuracy numbers.
    """
    target = count if count is not None else AGENT_SAMPLE_TARGETS[agent_id]
    rng = random.Random(f"{seed}:scale:{agent_id}")
    gen = _GENERATORS[agent_id]
    return [gen(rng) for _ in range(target)]


def build_all(per_agent: int = 5, *, seed: int = SEED) -> dict[str, list[DatasetRecord]]:
    records = generate_seed_dataset(per_agent, seed=seed)
    grouped: dict[str, list[DatasetRecord]] = {agent_id: [] for agent_id in AGENT_SAMPLE_TARGETS}
    for rec in records:
        grouped[rec.agent].append(rec)
    return grouped


def write_jsonl(
    records: list[DatasetRecord] | Iterator[DatasetRecord],
    filename: str,
    *,
    meta: dict[str, Any] | None = None,
) -> Path:
    """Write records as JSONL (one JSON object per line). `meta` becomes a
    leading `# meta` comment line for provenance."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    path = DATA_DIR / filename
    with path.open("w", encoding="utf-8") as fh:
        if meta:
            fh.write(json.dumps({"#meta": {"dataset_version": DATASET_VERSION, **meta}}) + "\n")
        for rec in records:
            fh.write(rec.to_json() + "\n")
    return path


def load_jsonl(filename: str) -> tuple[dict[str, Any] | None, list[dict[str, Any]]]:
    """Read a JSONL file back; returns (meta|None, records-as-dicts)."""
    path = DATA_DIR / filename
    meta: dict[str, Any] | None = None
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            if "#meta" in obj:
                meta = obj["#meta"]
            else:
                rows.append(obj)
    return meta, rows
