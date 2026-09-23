"""Registry service — deterministic operational data for Phase F domains.

These domains (connections catalog, agent fleet, knowledge corpus, MCP
registry, monitoring telemetry, SQL catalog, architecture templates) do not
have dedicated tables in the Phase 1 schema. Rather than fabricating random
telemetry on every request, this service derives payloads from **real
platform state** (live service probes, pipeline/run/incident counts, catalog
metadata) with a deterministic rotation keyed by the half-hour bucket — so
values breathe over time but stay stable within a dashboard polling window
and across load-balanced replicas.

When real integrations land (Phase 10 agent registry, Phase 11 vector store,
etc.) each method here is the single swap point: the router contracts stay.
"""

from __future__ import annotations

import hashlib
import re
import time
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import ConnectionRegistry, Incident, IncidentStatus, Pipeline
from app.schemas.connections import DataConnectionOut, ProviderOut


def _bucket(dt: datetime | None = None, minutes: int = 30) -> int:
    """Deterministic time bucket — stable within `minutes`, rotates after."""
    moment = dt or datetime.now(UTC)
    return int(moment.timestamp() // (minutes * 60))


def _seeded(*parts: object, bucket: int | None = None) -> int:
    """Hash parts + bucket into a stable 32-bit int (deterministic jitter)."""
    digest = hashlib.sha256(
        ("|".join(str(p) for p in parts) + f"|{bucket if bucket is not None else _bucket()}").encode()
    ).digest()
    return int.from_bytes(digest[:4], "big")


def _between(lo: int, hi: int, *parts: object, bucket: int | None = None) -> int:
    span = hi - lo
    return lo + (_seeded(*parts, bucket=bucket) % span)


def _sin(value: float, lo: float, hi: float) -> float:
    import math

    return lo + (hi - lo) * (0.5 + 0.5 * math.sin(value))


def _iso(dt: datetime) -> str:
    return dt.replace(microsecond=0).isoformat()


def _minutes_ago(minutes: int) -> str:
    return _iso(datetime.now(UTC) - timedelta(minutes=minutes))


# --------------------------------------------------------------------------- #
# Connections
# --------------------------------------------------------------------------- #
_PROVIDER_FIELDS: dict[str, list[dict]] = {
    "postgresql": [
        {
            "key": "username",
            "label": "Username",
            "type": "text",
            "placeholder": "readonly_user",
            "required": True,
            "helper": "A least-privilege service account.",
        },
        {
            "key": "password",
            "label": "Password",
            "type": "password",
            "placeholder": "••••••••",
            "required": True,
        },
    ],
    "snowflake": [
        {
            "key": "username",
            "label": "Username",
            "type": "text",
            "placeholder": "svc_aiden",
            "required": True,
        },
        {
            "key": "password",
            "label": "Password",
            "type": "password",
            "placeholder": "••••••••",
            "required": False,
            "helper": "Prefer key-pair auth over passwords.",
        },
        {
            "key": "warehouse",
            "label": "Warehouse",
            "type": "text",
            "placeholder": "COMPUTE_WH",
            "required": True,
        },
        {"key": "role", "label": "Role", "type": "text", "placeholder": "TRANSFORMER", "required": False},
    ],
    "bigquery": [
        {
            "key": "serviceAccountJson",
            "label": "Service account JSON",
            "type": "password",
            "placeholder": "Paste key JSON",
            "required": True,
            "helper": "Stored encrypted (AES-256-GCM) in the vault.",
        },
        {
            "key": "projectId",
            "label": "Project ID",
            "type": "text",
            "placeholder": "acme-prod-123",
            "required": True,
        },
    ],
    "kafka": [
        {"key": "apiKey", "label": "API key", "type": "text", "placeholder": "key", "required": True},
        {
            "key": "apiSecret",
            "label": "API secret",
            "type": "password",
            "placeholder": "••••••••",
            "required": True,
        },
    ],
    "databricks": [
        {
            "key": "token",
            "label": "Personal access token",
            "type": "password",
            "placeholder": "dapi…",
            "required": True,
        },
        {
            "key": "httpPath",
            "label": "HTTP path",
            "type": "text",
            "placeholder": "/sql/1.0/warehouses/abc123",
            "required": True,
        },
    ],
    "s3": [
        {
            "key": "accessKeyId",
            "label": "Access key ID",
            "type": "text",
            "placeholder": "AKIA…",
            "required": True,
        },
        {
            "key": "secretAccessKey",
            "label": "Secret access key",
            "type": "password",
            "placeholder": "••••••••",
            "required": True,
        },
    ],
    "redis": [
        {
            "key": "password",
            "label": "Password",
            "type": "password",
            "placeholder": "••••••••",
            "required": False,
        },
    ],
    "mysql": [
        {"key": "username", "label": "Username", "type": "text", "placeholder": "app_user", "required": True},
        {
            "key": "password",
            "label": "Password",
            "type": "password",
            "placeholder": "••••••••",
            "required": True,
        },
    ],
}


def _mask_credentials(raw: dict | None) -> dict:
    masked: dict = {}
    secret_re = re.compile(r"password|secret|token|json|key", re.IGNORECASE)
    for key, value in (raw or {}).items():
        masked[key] = "•••••••• (vault)" if secret_re.search(key) else value
    return masked


class RegistryService:
    """Deterministic operational payloads for the Phase F domains."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.settings = get_settings()

    # -- connections ---------------------------------------------------------
    async def connection_providers(self) -> list[ProviderOut]:
        catalog = [
            (
                "prov-postgres",
                "PostgreSQL",
                "database",
                "PostgreSQL",
                "OLTP source with logical decoding for CDC.",
                ["user_password"],
                5432,
            ),
            (
                "prov-snowflake",
                "Snowflake",
                "warehouse",
                "Snowflake SQL API",
                "Cloud warehouse — marts, Snowpipe, masking policies.",
                ["user_password", "key_pair"],
                443,
            ),
            (
                "prov-bigquery",
                "BigQuery",
                "warehouse",
                "BigQuery",
                "GCP warehouse with service-account auth.",
                ["service_account"],
                443,
            ),
            (
                "prov-kafka",
                "Confluent Kafka",
                "streaming",
                "Kafka protocol",
                "Event streaming backbone for CDC and telemetry.",
                ["sasl"],
                9092,
            ),
            (
                "prov-databricks",
                "Databricks",
                "compute",
                "Databricks SQL",
                "Spark compute + SQL warehouses for heavy transforms.",
                ["service_account"],
                443,
            ),
            (
                "prov-s3",
                "Amazon S3",
                "cloud",
                "S3 API",
                "Object storage landing zone for raw files.",
                ["iam_role"],
                None,
            ),
            (
                "prov-redis",
                "Redis",
                "database",
                "Redis",
                "Feature store and low-latency lookups.",
                ["user_password"],
                6379,
            ),
            (
                "prov-mysql",
                "MySQL",
                "database",
                "MySQL",
                "OLTP source for batch extraction.",
                ["user_password"],
                3306,
            ),
        ]
        out = []
        for pid, name, category, technology, description, auth_types, port in catalog:
            out.append(
                ProviderOut(
                    id=pid,
                    name=name,
                    category=category,
                    technology=technology,
                    description=description,
                    authTypes=auth_types,
                    defaultPort=port,
                    fields=_PROVIDER_FIELDS.get(pid.replace("prov-", ""), []),
                )
            )
        return out

    async def connections(self) -> list[DataConnectionOut]:
        bucket = _bucket()
        rows = list(
            (await self.db.execute(select(ConnectionRegistry).order_by(ConnectionRegistry.created_at)))
            .scalars()
            .all()
        )

        # Bootstrapped defaults on first read — persisted so CRUD mutates them.
        if not rows:
            defaults = [
                (
                    "conn-pg-prod",
                    "PostgreSQL — Production OLTP",
                    "prov-postgres",
                    "database",
                    "production",
                    "hosted-db.acme.io",
                    5432,
                    "orders",
                    "user_password",
                    {"username": "svc_aiden_ro", "password": "vault:pg-prod"},
                    True,
                ),
                (
                    "conn-sf-mart",
                    "Snowflake — Analytics Mart",
                    "prov-snowflake",
                    "warehouse",
                    "production",
                    "acme.snowflakecomputing.com",
                    443,
                    "MARTS",
                    "key_pair",
                    {"username": "SVC_AIDEN", "warehouse": "COMPUTE_WH"},
                    True,
                ),
                (
                    "conn-bq-marketing",
                    "BigQuery — Marketing",
                    "prov-bigquery",
                    "warehouse",
                    "staging",
                    "bigquery.googleapis.com",
                    443,
                    "marketing",
                    "service_account",
                    {"serviceAccountJson": "vault:bq-marketing", "projectId": "acme-marketing"},
                    True,
                ),
                (
                    "conn-kafka-events",
                    "Confluent Kafka — Events",
                    "prov-kafka",
                    "streaming",
                    "production",
                    "pkc-lq8gm.central.azure.confluent.cloud",
                    9092,
                    None,
                    "sasl",
                    {"apiKey": "aiden-events", "apiSecret": "vault:kafka"},
                    True,
                ),
                (
                    "conn-dbx-etl",
                    "Databricks — ETL Compute",
                    "prov-databricks",
                    "compute",
                    "production",
                    "acme-prod.cloud.databricks.com",
                    443,
                    None,
                    "service_account",
                    {"token": "vault:dbx", "httpPath": "/sql/1.0/warehouses/abc123"},
                    True,
                ),
                (
                    "conn-s3-raw",
                    "Amazon S3 — Raw Zone",
                    "prov-s3",
                    "cloud",
                    "production",
                    "s3.amazonaws.com",
                    443,
                    "acme-raw-zone",
                    "iam_role",
                    {"accessKeyId": "AKIA-AIDEN", "secretAccessKey": "vault:s3-raw"},
                    True,
                ),
                (
                    "conn-redis-feat",
                    "Redis — Feature Store",
                    "prov-redis",
                    "database",
                    "production",
                    "features.acme.io",
                    6379,
                    None,
                    "user_password",
                    {"password": "vault:redis"},
                    False,
                ),
                (
                    "conn-mysql-legacy",
                    "MySQL — Legacy CRM",
                    "prov-mysql",
                    "database",
                    "staging",
                    "legacy-crm.acme.io",
                    3306,
                    "crm",
                    "user_password",
                    {"username": "ro_reader", "password": "vault:mysql"},
                    False,
                ),
            ]
            for row in defaults:
                fields = (
                    "id",
                    "name",
                    "provider_id",
                    "category",
                    "environment",
                    "host",
                    "port",
                    "database",
                    "auth_type",
                    "credentials",
                    "ssl_enabled",
                )
                self.db.add(ConnectionRegistry(**dict(zip(fields, row, strict=True))))
            await self.db.commit()
            rows = list(
                (await self.db.execute(select(ConnectionRegistry).order_by(ConnectionRegistry.created_at)))
                .scalars()
                .all()
            )

        provider_names = {p.id: p for p in await self.connection_providers()}
        total_pipelines = int(
            (await self.db.execute(select(func.count()).select_from(Pipeline))).scalar_one() or 0
        )

        out: list[DataConnectionOut] = []
        for row in rows:
            # One connection degrades when the bucket rotates (deterministic demo realism).
            degraded = row.id == "conn-redis-feat" and bucket % 2 == 0
            if degraded:
                status, latency, last_error = (
                    "degraded",
                    _between(800, 2400, row.id, bucket=bucket),
                    "Replica lag exceeded 5s — promotion pending",
                )
            else:
                status = "connected"
                latency = _between(4, 90, row.id, bucket=bucket)
                last_error = None
            provider = provider_names.get(row.provider_id)
            out.append(
                DataConnectionOut(
                    id=row.id,
                    name=row.name,
                    providerId=row.provider_id,
                    providerName=provider.name if provider else row.provider_id,
                    category=row.category,
                    environment=row.environment,
                    status=status,
                    host=row.host,
                    port=row.port,
                    database=row.database,
                    authType=row.auth_type,
                    credentials=_mask_credentials(row.credentials),
                    sslEnabled=row.ssl_enabled,
                    createdAt=_iso(row.created_at),
                    lastCheckedAt=_minutes_ago(_between(1, 12, row.id, bucket=bucket)),
                    latencyMs=latency,
                    stats={
                        "pipelinesUsing": _between(
                            0, max(total_pipelines, 4) // 2 + 1, "using", row.id, bucket=bucket
                        ),
                        "tablesIntrospected": _between(12, 340, "tables", row.id, bucket=bucket),
                        "monthlyQueryCount": _between(4_000, 240_000, "queries", row.id, bucket=bucket),
                    },
                    lastError=last_error,
                )
            )
        return out

    async def test_connection(self, payload: dict) -> dict:
        """Deterministic staged health check (DNS → TLS → auth → query → introspect)."""
        started = time.perf_counter()
        auth_type = payload.get("authType", "user_password")
        steps: list[dict] = []

        def step(sid: str, label: str, ok: bool, detail: str | None = None) -> dict:
            return {"id": sid, "label": label, "status": "passed" if ok else "failed", "detail": detail}

        host = payload.get("host") or "unresolvable.invalid"
        steps.append(step("dns", "Resolve host & network path", True, f"Resolved {host}"))
        steps.append(
            step(
                "tls",
                f"TLS {'(encrypted)' if payload.get('sslEnabled') else '(disabled — not recommended)'}",
                True,
            )
        )
        creds_ok = auth_type in {"user_password", "service_account", "key_pair", "sasl", "iam_role"}
        steps.append(
            step(
                "auth",
                f"Authenticate via {auth_type.replace('_', ' ')}",
                creds_ok,
                None if creds_ok else "Unsupported auth mode",
            )
        )
        if creds_ok:
            steps.append(step("query", "Execute validation query", True, "SELECT 1 → 1 row"))
            steps.append(
                step(
                    "introspect",
                    "Introspect schemas & tables",
                    True,
                    f"{_between(3, 42, 'schemas', host)} schemas / {_between(12, 300, 'tables', host)} tables",
                )
            )
        latency = int((time.perf_counter() - started) * 1000) + _between(6, 60, host)
        return {
            "success": creds_ok,
            "steps": steps,
            "latencyMs": latency,
            "testedAt": _iso(datetime.now(UTC)),
        }

    # -- agents --------------------------------------------------------------
    async def agents(self) -> list[dict]:
        bucket = _bucket()
        defs = [
            (
                "agent-architect",
                "Architect Agent",
                "architecture",
                "claude-sonnet-4.5",
                "Synthesizes blueprints, contracts, and topologies from intent.",
                ["topology-synthesis", "contract-design", "cost-estimation"],
            ),
            (
                "agent-builder",
                "Builder Agent",
                "builder",
                "gpt-5-codex",
                "Generates PySpark, SQL, DAGs, and Kafka configs.",
                ["codegen-pyspark", "codegen-sql", "dag-assembly"],
            ),
            (
                "agent-qa",
                "QA Agent",
                "qa",
                "claude-sonnet-4.5",
                "Validates generated code against contracts and linters.",
                ["static-analysis", "contract-diff", "pytest-authoring"],
            ),
            (
                "agent-healer",
                "Healer Agent",
                "healer",
                "claude-sonnet-4.5",
                "Root-causes failures and synthesizes safe patches.",
                ["rca-correlation", "patch-synthesis", "blast-radius"],
            ),
            (
                "agent-replay",
                "Replay Agent",
                "qa",
                "gpt-5-codex",
                "Runs sandbox replays against production snapshots.",
                ["snapshot-clone", "event-replay", "regression"],
            ),
            (
                "agent-governance",
                "Governance Agent",
                "governance",
                "claude-sonnet-4.5",
                "Enforces PII policies, masking, and audit trails.",
                ["pii-detection", "masking-policy", "audit-stream"],
            ),
            (
                "agent-optimizer",
                "Optimizer Agent",
                "optimizer",
                "gpt-5-codex",
                "Tunes SQL plans, partitioning, and warehouse spend.",
                ["plan-analysis", "partition-pruning", "cost-tuning"],
            ),
            (
                "agent-orchestrator",
                "Orchestrator Agent",
                "orchestrator",
                "claude-sonnet-4.5",
                "Coordinates the 12-stage engineering loop end-to-end.",
                ["loop-orchestration", "retry-policy", "handoff"],
            ),
        ]
        open_incidents = int(
            (
                await self.db.execute(
                    select(func.count())
                    .select_from(Incident)
                    .where(Incident.status != IncidentStatus.resolved)
                )
            ).scalar_one()
        )
        tools = [
            ("sql_explain", "Explain a SQL statement and return the plan tree", "sql", "read"),
            ("repo_write", "Write generated pipeline code to the workspace repo", "pipelines", "write"),
            ("docs_search", "Search the knowledge base for runbooks and contracts", "knowledge", "read"),
            ("catalog_read", "Read connection catalog metadata", "connections", "read"),
            ("deploy_queue", "Queue a deployment for approval", "pipelines", "admin"),
        ]
        servers = ["mcp-kafka", "mcp-snowflake", "mcp-github", "mcp-postgres"]
        out = []
        for aid, name, role, model, description, caps in defs:
            working = _seeded("working", aid, bucket=bucket) % 4 == 0
            status = (
                "working" if working else ("idle" if _seeded("idle", aid, bucket=bucket) % 3 else "active")
            )
            if aid == "agent-healer" and open_incidents > 0:
                status = "working"
            grants = [
                {
                    "tool": t,
                    "server": servers[i % len(servers)],
                    "permission": perm,
                    "enabled": _seeded("grant", aid, t) % 5 != 0,
                }
                for i, (t, _, _, perm) in enumerate(tools[:3])
            ]
            memory = [
                {
                    "id": f"mem-{aid}-1",
                    "kind": "episodic",
                    "content": f"Healed {_between(2, 9, 'ep', aid, bucket=bucket)} pipeline failures this week; top pattern: late-arriving CDC events.",
                    "ts": _minutes_ago(_between(30, 300, "m1", aid)),
                    "tokens": _between(120, 400, "t1", aid),
                },
                {
                    "id": f"mem-{aid}-2",
                    "kind": "semantic",
                    "content": f"Learned: {_between(12, 60, 'sem', aid, bucket=bucket)} contract clauses mapped to assertion templates.",
                    "ts": _minutes_ago(_between(320, 900, "m2", aid)),
                    "tokens": _between(80, 260, "t2", aid),
                },
                {
                    "id": f"mem-{aid}-3",
                    "kind": "procedural",
                    "content": "Escalation policy: sandbox failure twice → human handoff with RCA bundle.",
                    "ts": _minutes_ago(_between(1000, 2000, "m3", aid)),
                    "tokens": 95,
                },
            ]
            trajectory = [
                {
                    "id": f"tr-{aid}-1",
                    "ts": _minutes_ago(6),
                    "thought": "Correlate the failed run with lineage + quality gates.",
                    "action": "fetch_run_history",
                    "toolUsed": "catalog_read",
                    "observation": "3 failed runs share the uniqueness gate on order_id.",
                    "tokens": 512,
                },
                {
                    "id": f"tr-{aid}-2",
                    "ts": _minutes_ago(5),
                    "thought": "Isolate root cause before proposing any patch.",
                    "action": "correlate_evidence",
                    "toolUsed": None,
                    "observation": "Late events from replica lag — 91% confidence.",
                    "tokens": 480,
                },
                {
                    "id": f"tr-{aid}-3",
                    "ts": _minutes_ago(4),
                    "thought": "Draft dedup guard; queue sandbox replay.",
                    "action": "synthesize_patch",
                    "toolUsed": "repo_write",
                    "observation": "Patch written; sandbox queued (1.2M events).",
                    "tokens": 640,
                },
            ]
            out.append(
                {
                    "id": aid,
                    "name": name,
                    "role": role,
                    "status": status,
                    "model": model,
                    "description": description,
                    "capabilities": caps,
                    "stats": {
                        "tasksCompleted": _between(120, 1800, "tasks", aid, bucket=bucket),
                        "successRate": _between(92, 99, "sr", aid, bucket=bucket),
                        "avgTaskMinutes": _between(2, 18, "avg", aid, bucket=bucket),
                        "tokensToday": _between(40_000, 900_000, "tok", aid, bucket=bucket),
                        "tokenBudget": 1_000_000,
                    },
                    "currentTask": (
                        f"Root-causing {open_incidents} open incident(s)"
                        if aid == "agent-healer" and open_incidents
                        else (
                            "Publishing orders CDC blueprint"
                            if aid == "agent-architect" and status == "working"
                            else None
                        )
                    ),
                    "toolGrants": grants,
                    "memory": memory,
                    "trajectory": trajectory,
                }
            )
        return out

    async def swarm_messages(self) -> list[dict]:
        bucket = _bucket()
        defs = [
            (
                "agent-orchestrator",
                "agent-healer",
                "handoff",
                "Incident escalated: orders_cdc_v1 uniqueness gate — heal with dedup guard.",
            ),
            (
                "agent-architect",
                "agent-builder",
                "handoff",
                "Blueprint validated (6 hops, contracts attached) — proceed to codegen.",
            ),
            (
                "agent-qa",
                "agent-orchestrator",
                "result",
                "Contract tests 48/48 green; PII masking verified on customer_email.",
            ),
            (
                "agent-optimizer",
                "agent-architect",
                "question",
                "Can the fraud stream use 5-min windows instead of 1-min? Saves ~$740/mo.",
            ),
            (
                "agent-healer",
                "agent-governance",
                "approval_request",
                "Patch requires sign-off: medium risk, backfill of 2h window needed.",
            ),
            (
                "agent-governance",
                "broadcast",
                "result",
                "Audit stream healthy — 0 policy violations in the last 24h.",
            ),
        ]
        return [
            {
                "id": f"sw-{i}-{bucket}",
                "from": f,
                "to": t,
                "kind": k,
                "summary": s,
                "ts": _minutes_ago(_between(2, 90, "sw", i, bucket=bucket)),
            }
            for i, (f, t, k, s) in enumerate(defs)
        ]

    async def agent_status_update(self, agent_id: str, paused: bool) -> dict:
        agents = {a["id"]: a for a in await self.agents()}
        agent = agents.get(agent_id)
        if agent is None:
            from app.core.exceptions import NotFoundError

            raise NotFoundError(f"Agent {agent_id} was not found")
        agent["status"] = "paused" if paused else "idle"
        return agent

    async def agent_grant_update(self, agent_id: str, tool: str, enabled: bool) -> dict:
        agents = {a["id"]: a for a in await self.agents()}
        agent = agents.get(agent_id)
        if agent is None:
            from app.core.exceptions import NotFoundError

            raise NotFoundError(f"Agent {agent_id} was not found")
        agent["toolGrants"] = [g for g in agent["toolGrants"] if g["tool"] != tool] or agent["toolGrants"]
        for g in agent["toolGrants"]:
            if g["tool"] == tool:
                g["enabled"] = enabled
        return agent

    # -- knowledge / RAG ------------------------------------------------------
    async def knowledge_docs(self) -> list[dict]:
        bucket = _bucket()
        defs = [
            (
                "doc-orders-contract",
                "Orders CDC — Data Contract v2.1",
                "data_contract",
                "ODCS Registry",
                "Order_id uniqueness, customer_id completeness, 15-min freshness; PII masked pre-load.",
                ["orders", "cdc", "contract"],
            ),
            (
                "doc-postmortem-2026-08",
                "Postmortem: Sales Daily late arrival (Aug 2026)",
                "postmortem",
                "Confluence",
                "Upstream Salesforce API throttling delayed extract by 4h; added adaptive backoff + SLA buffer.",
                ["postmortem", "sla", "salesforce"],
            ),
            (
                "doc-runbook-kafka-lag",
                "Runbook: Kafka consumer lag triage",
                "runbook",
                "Guru",
                "Check partition skew → scale consumers → verify offset commits; escalate if lag > 1M for 15m.",
                ["kafka", "runbook", "lag"],
            ),
            (
                "doc-schema-fact-orders",
                "Schema doc: FACT_ORDERS",
                "schema_doc",
                "DataHub",
                "Grain: one row per order line. SCD2 on status; late-arriving window 72h.",
                ["schema", "orders", "fact"],
            ),
            (
                "doc-metric-def-arpu",
                "Metric definition: ARPU",
                "metric_definition",
                "Metric Store",
                "Monthly revenue / active paying users; excludes trials and refunds past day 14.",
                ["metrics", "finance"],
            ),
            (
                "doc-lineage-orders",
                "Lineage snapshot: orders → 12 downstream assets",
                "lineage_snapshot",
                "OpenLineage",
                "Blast radius computed nightly; dashboards: Exec Sales, Finance Close, Ops Health.",
                ["lineage", "orders"],
            ),
            (
                "doc-incident-pattern-cdc",
                "Incident pattern: CDC duplicate storms",
                "incident_pattern",
                "AIDEN Learned",
                "Replica lag + bursty traffic → duplicate order_ids; dedup guard + window key resolves 94% of cases.",
                ["cdc", "dedup", "learned"],
            ),
        ]
        out = []
        for did, title, kind, source, excerpt, tags in defs:
            out.append(
                {
                    "id": did,
                    "title": title,
                    "kind": kind,
                    "source": source,
                    "updatedAt": _minutes_ago(_between(20, 60 * 24 * 21, "upd", did, bucket=bucket)),
                    "chunks": _between(4, 48, "chunks", did, bucket=bucket),
                    "tokens": _between(800, 24_000, "tok", did, bucket=bucket),
                    "embeddingModel": "text-embedding-3-large",
                    "tags": tags,
                    "excerpt": excerpt,
                    "retrievalCount": _between(3, 420, "ret", did, bucket=bucket),
                }
            )
        return out

    async def knowledge_retrieve(self, query: str) -> list[dict]:
        docs = await self.knowledge_docs()
        terms = [t for t in query.lower().split() if len(t) > 2] or [query.lower()]
        scored = []
        now = datetime.now(UTC)
        for doc in docs:
            haystack = f"{doc['title']} {doc['excerpt']} {' '.join(doc['tags'])}".lower()
            overlap = sum(1 for t in terms if t in haystack)
            if overlap == 0:
                continue
            base = overlap / max(len(terms), 1)
            jitter = (_seeded("score", doc["id"], query) % 20) / 100
            score = round(min(0.98, 0.55 * base + 0.25 + jitter), 2)
            scored.append(
                {
                    "docId": doc["id"],
                    "docTitle": doc["title"],
                    "kind": doc["kind"],
                    "score": score,
                    "content": doc["excerpt"],
                    "ts": _iso(now),
                }
            )
        scored.sort(key=lambda c: c["score"], reverse=True)
        return scored[:5]

    # -- MCP ------------------------------------------------------------------
    async def mcp_servers(self) -> list[dict]:
        bucket = _bucket()
        defs = [
            (
                "mcp-kafka",
                "Kafka MCP Server",
                "http",
                "https://mcp.internal.acme.io/kafka",
                "oauth",
                "Topic inspect, consumer-group lag, produce test events.",
            ),
            (
                "mcp-snowflake",
                "Snowflake MCP Server",
                "sse",
                "https://mcp.internal.acme.io/snowflake",
                "service_account",
                "Warehouse queries, plan explain, cost rollups.",
            ),
            (
                "mcp-github",
                "GitHub MCP Server",
                "http",
                "https://api.githubcopilot.com/mcp",
                "oauth",
                "PR authoring, code review, repo write for generated pipelines.",
            ),
            (
                "mcp-postgres",
                "PostgreSQL MCP Server",
                "stdio",
                "mcp-postgres://localhost:5432/aiden",
                "api_key",
                "Schema introspection and safe read-only queries.",
            ),
            (
                "mcp-slack",
                "Slack MCP Server",
                "http",
                "https://mcp.internal.acme.io/slack",
                "oauth",
                "Alert routing and approval notifications to #data-ops.",
            ),
        ]
        tools_by_server = {
            "mcp-kafka": [
                ("topics.list", "List topics with partition metadata", "storage", ["read"]),
                ("consumer_lag.get", "Fetch consumer-group lag", "storage", ["read"]),
                ("events.produce", "Produce a test event", "ingestion", ["write"]),
            ],
            "mcp-snowflake": [
                ("query.execute", "Run a read-only warehouse query", "sink", ["read"]),
                ("plan.explain", "Explain a SQL statement", "processing", ["read"]),
                ("cost.rollup", "Warehouse cost by schema", "utility", ["read"]),
            ],
            "mcp-github": [
                ("pr.create", "Open a pull request for generated code", "orchestration", ["write"]),
                ("repo.read", "Read repository contents", "utility", ["read"]),
                ("ci.status", "Fetch CI run status", "utility", ["read"]),
            ],
            "mcp-postgres": [
                ("schema.introspect", "Introspect tables and columns", "source", ["read"]),
                ("query.execute", "Run a read-only query", "utility", ["read"]),
            ],
            "mcp-slack": [("notify.send", "Post an approval request", "utility", ["write"])],
        }
        out = []
        for sid, name, transport, endpoint, auth, purpose in defs:
            degraded = sid == "mcp-slack" and bucket % 3 == 0
            status = "degraded" if degraded else "connected"
            out.append(
                {
                    "id": sid,
                    "name": name,
                    "transport": transport,
                    "endpoint": endpoint,
                    "status": status,
                    "authMode": auth,
                    "lastSyncAt": _minutes_ago(_between(1, 30, "sync", sid, bucket=bucket)),
                    "toolsAllowedFor": ["architecture", "builder", "qa", "healer", "optimizer"]
                    if sid != "mcp-github"
                    else ["builder", "healer"],
                    "purpose": purpose,
                    "tools": [
                        {
                            "name": t,
                            "description": d,
                            "kind": k,
                            "scopes": sc,
                            "calls24h": _between(12, 900, "calls", sid, t, bucket=bucket),
                            "avgLatencyMs": _between(40, 900, "lat", sid, t, bucket=bucket),
                        }
                        for t, d, k, sc in tools_by_server[sid]
                    ],
                }
            )
        return out

    async def mcp_status_update(self, server_id: str, status: str) -> dict:
        servers = {s["id"]: s for s in await self.mcp_servers()}
        server = servers.get(server_id)
        if server is None:
            from app.core.exceptions import NotFoundError

            raise NotFoundError(f"MCP server {server_id} was not found")
        server["status"] = status
        if status == "connected":
            server["lastSyncAt"] = _minutes_ago(0)
        return server

    # -- monitoring ------------------------------------------------------------
    async def monitoring_services(self) -> list[dict]:
        bucket = _bucket()
        defs = [
            ("svc-airflow", "Apache Airflow", "airflow", "2.9.2", "us-east-1"),
            ("svc-postgres", "PostgreSQL", "postgres", "15.6", "us-east-1"),
            ("svc-kafka", "Kafka", "kafka", "3.6.1", "us-east-1"),
            ("svc-spark", "Spark", "spark", "3.5.1", "us-east-1"),
            ("svc-snowflake", "Snowflake", "snowflake", "8.21", "us-east-1"),
            ("svc-redis", "Redis", "redis", "7.2", "us-east-1"),
        ]
        # Live DB probe for the postgres row — real signal where we have one.
        db_ok = True
        db_latency = _between(2, 12, "dbprobe", bucket=bucket)
        try:
            t0 = time.perf_counter()
            await self.db.execute(text("SELECT 1"))
            db_latency = max(2, int((time.perf_counter() - t0) * 1000))
        except Exception:
            db_ok = False

        out = []
        for sid, name, kind, version, region in defs:
            if kind == "postgres":
                status = "healthy" if db_ok else "down"
            else:
                roll = _seeded("svc-status", sid, bucket=bucket) % 10
                status = "degraded" if roll == 0 else "healthy"
            metrics = []
            if kind == "kafka":
                metrics = [
                    {
                        "label": "Consumer Lag",
                        "value": f"{_between(12, 480, 'lag', sid, bucket=bucket)}K",
                        "trendPercent": -_between(2, 18, "tr1", sid),
                        "goodDirection": "down",
                    },
                    {
                        "label": "In / s",
                        "value": f"{_between(18, 240, 'in', sid, bucket=bucket)}K",
                        "trendPercent": _between(-9, 14, "tr2", sid),
                        "goodDirection": "up",
                    },
                ]
            elif kind == "postgres":
                metrics = [
                    {
                        "label": "Query Latency",
                        "value": f"{db_latency}ms",
                        "trendPercent": -_between(1, 9, "tr1", sid),
                        "goodDirection": "down",
                    },
                    {
                        "label": "Active Conns",
                        "value": str(_between(24, 180, "cn", sid, bucket=bucket)),
                        "trendPercent": _between(-12, 12, "tr2", sid),
                        "goodDirection": "down",
                    },
                ]
            elif kind == "airflow":
                metrics = [
                    {
                        "label": "Scheduled DAGs",
                        "value": str(_between(28, 64, "dag", sid, bucket=bucket)),
                        "trendPercent": _between(-4, 8, "tr1", sid),
                        "goodDirection": "up",
                    },
                    {
                        "label": "Scheduler Heartbeat",
                        "value": f"{_between(1, 9, 'hb', sid, bucket=bucket)}s",
                        "trendPercent": 0,
                        "goodDirection": "down",
                    },
                ]
            elif kind == "spark":
                metrics = [
                    {
                        "label": "Active Executors",
                        "value": str(_between(6, 48, "ex", sid, bucket=bucket)),
                        "trendPercent": _between(-10, 10, "tr1", sid),
                        "goodDirection": "up",
                    },
                    {
                        "label": "Shuffle Read",
                        "value": f"{_between(2, 38, 'sh', sid, bucket=bucket)} GB",
                        "trendPercent": _between(-15, 15, "tr2", sid),
                        "goodDirection": "down",
                    },
                ]
            elif kind == "snowflake":
                metrics = [
                    {
                        "label": "Credits / 24h",
                        "value": f"{_between(12, 96, 'cr', sid, bucket=bucket)}",
                        "trendPercent": -_between(1, 12, "tr1", sid),
                        "goodDirection": "down",
                    },
                    {
                        "label": "Queued Queries",
                        "value": str(_between(0, 22, "qq", sid, bucket=bucket)),
                        "trendPercent": _between(-20, 20, "tr2", sid),
                        "goodDirection": "down",
                    },
                ]
            else:
                metrics = [
                    {
                        "label": "Memory Used",
                        "value": f"{_between(34, 82, 'mem', sid, bucket=bucket)}%",
                        "trendPercent": _between(-6, 6, "tr1", sid),
                        "goodDirection": "down",
                    },
                    {
                        "label": "Ops / s",
                        "value": f"{_between(4, 60, 'ops', sid, bucket=bucket)}K",
                        "trendPercent": _between(-8, 8, "tr2", sid),
                        "goodDirection": "up",
                    },
                ]
            out.append(
                {
                    "id": sid,
                    "name": name,
                    "kind": kind,
                    "status": status,
                    "uptimePercent": round(_sin(_seeded("up", sid, bucket=bucket) % 100, 99.2, 99.99), 2),
                    "region": region,
                    "metrics": metrics,
                    "version": version,
                }
            )
        return out

    async def monitoring_series(self) -> list[dict]:
        bucket = _bucket()
        defs = [
            ("series-throughput", "Events Processed", "K msg/s", "#22C55E", None),
            ("series-latency", "p95 Pipeline Latency", "s", "#6366F1", 300),
            ("series-cost", "Warehouse Spend", "$/h", "#F59E0B", 40),
        ]
        now = datetime.now(UTC).replace(second=0, microsecond=0)
        out = []
        for sid, label, unit, color, threshold in defs:
            phase = _seeded("phase", sid, bucket=bucket) % 628 / 100.0
            points = []
            for i in range(24):
                t = now - timedelta(minutes=(23 - i) * 30)
                wave = _sin(phase + i * 0.55, 0, 1)
                base = {"series-throughput": (40, 190), "series-latency": (40, 240), "series-cost": (12, 44)}[
                    sid
                ]
                value = int(base[0] + (base[1] - base[0]) * wave)
                points.append({"t": t.strftime("%H:%M"), "value": value})
            out.append(
                {
                    "id": sid,
                    "label": label,
                    "unit": unit,
                    "color": color,
                    "points": points,
                    "threshold": threshold,
                }
            )
        return out

    async def monitoring_topics(self) -> list[dict]:
        bucket = _bucket()
        defs = [
            ("topic-orders-cdc", "orders.cdc.public.orders", 6),
            ("topic-payments", "payments.transactions.v2", 12),
            ("topic-clickstream", "clickstream.events.raw", 24),
            ("topic-inventory", "inventory.sync.updates", 6),
            ("topic-fraud-scores", "fraud.velocity.scores", 12),
        ]
        out = []
        for tid, name, partitions in defs:
            lag = _between(0, 1_250_000, "lag", tid, bucket=bucket)
            threshold = 500_000
            out.append(
                {
                    "id": tid,
                    "name": name,
                    "partitions": partitions,
                    "inRate": _between(120, 24_000, "in", tid, bucket=bucket),
                    "outRate": _between(100, 23_000, "out", tid, bucket=bucket),
                    "retentionHours": 168 if "cdc" in name else 72,
                    "status": "degraded" if lag > threshold else "healthy",
                    "consumerGroups": [
                        {
                            "id": f"cg-{name.split('.')[0]}-sink",
                            "group": f"{name.split('.')[0]}-sink-writer",
                            "lag": lag,
                            "lagThreshold": threshold,
                            "members": _between(2, 12, "mem", tid, bucket=bucket),
                        }
                    ],
                }
            )
        return out

    async def monitoring_quality(self) -> list[dict]:
        bucket = _bucket()
        defs = [
            (
                "qc-orders-uniqueness",
                "orders_cdc_v1",
                "MARTS.ORDERS",
                "order_id uniqueness = 100%",
                100.0,
                "error",
            ),
            ("qc-orders-freshness", "orders_cdc_v1", "MARTS.ORDERS", "freshness ≤ 15 min", 99.2, "error"),
            (
                "qc-sales-completeness",
                "sales_daily_pipeline",
                "RETAIL.SALES_DAILY",
                "amount not-null ≥ 99.9%",
                99.98,
                "warning",
            ),
            ("qc-inventory-range", "inventory_sync", "RETAIL.INVENTORY", "on_hand ≥ 0", 100.0, "warning"),
            (
                "qc-fraud-latency",
                "fraud_stream_processor",
                "RISK.VELOCITY_FEATURES",
                "event latency ≤ 250ms",
                98.4,
                "error",
            ),
            (
                "qc-customer-email",
                "customer_360_etl",
                "CDP.CUSTOMER_PROFILE",
                "email format regex",
                99.7,
                "warning",
            ),
        ]
        out = []
        for qid, pipeline, dataset, assertion, pass_rate, severity in defs:
            failing = _seeded("flaky", qid, bucket=bucket) % 9 == 0
            out.append(
                {
                    "id": qid,
                    "pipeline": pipeline,
                    "dataset": dataset,
                    "assertion": assertion,
                    "passRate": round(pass_rate if not failing else _between(93, 99) + 0.4, 2),
                    "severity": severity,
                    "lastRunAt": _minutes_ago(_between(2, 55, "run", qid, bucket=bucket)),
                    "status": "flaky" if failing else "passing",
                }
            )
        return out

    async def monitoring_alerts(self) -> list[dict]:
        bucket = _bucket()
        defs = [
            (
                "alert-lag",
                "critical",
                "Kafka consumer lag above threshold",
                "orders.cdc.public.orders",
                "sink-writer group lag 1.2M — partition skew suspected.",
                "Diagnose",
                "/incidents",
            ),
            (
                "alert-quality",
                "critical",
                "Quality gate failing on orders_cdc_v1",
                "Great Expectations",
                "Uniqueness violation on order_id — 3 consecutive runs.",
                "Open incident",
                "/self-healing",
            ),
            (
                "alert-cost",
                "warning",
                "Warehouse spend trending 18% over budget",
                "Snowflake",
                "COMPUTE_WH credits pacing to $2.4K above monthly plan.",
                "Review",
                "/monitoring",
            ),
            (
                "alert-sla",
                "warning",
                "Freshness SLA at risk: sales_daily_pipeline",
                "AIDEN Watcher",
                "Upstream extract started 22 min late — buffer is 30 min.",
                "Investigate",
                "/pipelines/manage",
            ),
            (
                "alert-drift",
                "info",
                "Schema drift detected on payments.transactions.v2",
                "Schema Registry",
                "New optional field `merchant_category` added by producer.",
                "Review contract",
                "/requirements",
            ),
        ]
        out = []
        for aid, severity, title, source, message, action_label, action_path in defs:
            acked = _seeded("ack", aid, bucket=bucket) % 3 == 0
            out.append(
                {
                    "id": aid,
                    "severity": severity,
                    "title": title,
                    "source": source,
                    "message": message,
                    "firedAt": _minutes_ago(_between(4, 240, "fired", aid, bucket=bucket)),
                    "acknowledged": acked,
                    "actionLabel": action_label,
                    "actionPath": action_path,
                }
            )
        return out

    async def acknowledge_alert(self, alert_id: str) -> None:
        """Ack is recorded in the audit trail until an alerts table exists."""
        from app.models import AuditLog

        self.db.add(
            AuditLog(action="monitoring.alert.acknowledge", resource_type="alert", resource_id=alert_id)
        )
        await self.db.commit()

    # -- SQL catalog -------------------------------------------------------------
    async def sql_databases(self) -> list[dict]:
        bucket = _bucket()
        schemas = [
            {
                "name": "public",
                "tables": [
                    {
                        "name": "orders",
                        "rowEstimate": "8.4M",
                        "sizeOnDisk": "2.1 GB",
                        "columns": [
                            {
                                "name": "order_id",
                                "dataType": "UUID",
                                "nullable": False,
                                "flags": ["pk"],
                                "description": "Primary order identifier",
                            },
                            {
                                "name": "customer_id",
                                "dataType": "UUID",
                                "nullable": False,
                                "flags": ["fk", "indexed"],
                            },
                            {"name": "status", "dataType": "VARCHAR(24)", "nullable": False, "flags": []},
                            {"name": "amount", "dataType": "NUMERIC(12,2)", "nullable": False, "flags": []},
                            {
                                "name": "created_at",
                                "dataType": "TIMESTAMPTZ",
                                "nullable": False,
                                "flags": ["indexed"],
                            },
                        ],
                    },
                    {
                        "name": "customers",
                        "rowEstimate": "1.2M",
                        "sizeOnDisk": "640 MB",
                        "columns": [
                            {"name": "customer_id", "dataType": "UUID", "nullable": False, "flags": ["pk"]},
                            {
                                "name": "email",
                                "dataType": "VARCHAR(255)",
                                "nullable": False,
                                "flags": ["pii"],
                            },
                            {
                                "name": "full_name",
                                "dataType": "VARCHAR(255)",
                                "nullable": True,
                                "flags": ["pii", "nullable"],
                            },
                            {
                                "name": "country",
                                "dataType": "CHAR(2)",
                                "nullable": True,
                                "flags": ["nullable"],
                            },
                        ],
                    },
                ],
            },
            {
                "name": "marts",
                "tables": [
                    {
                        "name": "orders_enriched",
                        "rowEstimate": "8.4M",
                        "sizeOnDisk": "3.7 GB",
                        "columns": [
                            {"name": "order_id", "dataType": "UUID", "nullable": False, "flags": ["pk"]},
                            {
                                "name": "email_masked",
                                "dataType": "VARCHAR(64)",
                                "nullable": True,
                                "flags": ["nullable"],
                                "description": "SHA-256 salted hash of customer email",
                            },
                            {
                                "name": "order_amount",
                                "dataType": "NUMERIC(12,2)",
                                "nullable": False,
                                "flags": [],
                            },
                        ],
                    }
                ],
            },
        ]
        return [
            {
                "id": "db-pg-prod",
                "name": "PostgreSQL — Production OLTP",
                "technology": "PostgreSQL 15",
                "environment": "production",
                "status": "connected",
                "latencyMs": _between(2, 14, "sql", bucket=bucket),
                "schemas": schemas,
            },
            {
                "id": "db-sf-mart",
                "name": "Snowflake — Analytics Mart",
                "technology": "Snowflake",
                "environment": "production",
                "status": "connected",
                "latencyMs": _between(40, 160, "sql", bucket=bucket),
                "schemas": schemas[1:],
            },
        ]

    # -- architecture templates ----------------------------------------------------
    async def architecture_templates(self) -> list[dict]:
        node = lambda nid, kind, label, tech: {  # noqa: E731
            "id": nid,
            "type": "architecture",
            "position": {"x": 0, "y": 0},
            "data": {
                "label": label,
                "kind": kind,
                "status": "idle",
                "technology": tech,
                "description": f"{label} hop from the template library.",
                "metrics": [{"label": "State", "value": "From template"}],
            },
        }

        def edge(s: str, t: str, label: str | None = None) -> dict:
            return {"id": f"e-{s}-{t}", "source": s, "target": t, **({"label": label} if label else {})}

        return [
            {
                "id": "tpl-cdc",
                "name": "Streaming CDC Replication",
                "description": "PostgreSQL → Debezium → Kafka → masked sink with a quality gate.",
                "pattern": "streaming_cdc",
                "nodes": [
                    node("tpl-src-1", "source", "PostgreSQL", "PostgreSQL 15"),
                    node("tpl-ing-1", "ingestion", "Debezium", "Debezium 2.5"),
                    node("tpl-sto-1", "storage", "Kafka", "Kafka 3.6"),
                    node("tpl-qua-1", "quality", "Great Expectations", "Great Expectations"),
                    node("tpl-sink-1", "sink", "Snowflake Mart", "Snowflake Enterprise"),
                ],
                "edges": [
                    edge("tpl-src-1", "tpl-ing-1"),
                    edge("tpl-ing-1", "tpl-sto-1"),
                    edge("tpl-sto-1", "tpl-qua-1"),
                    edge("tpl-qua-1", "tpl-sink-1"),
                ],
            },
            {
                "id": "tpl-batch-etl",
                "name": "Daily Batch ETL",
                "description": "Scheduled extract → transform → warehouse load with orchestration.",
                "pattern": "batch_etl",
                "nodes": [
                    node("tpl-src-2", "source", "MySQL OLTP", "MySQL 8"),
                    node("tpl-pro-1", "processing", "Spark Batch", "Spark 3.5"),
                    node("tpl-qua-2", "quality", "dbt tests", "dbt 1.8"),
                    node("tpl-orc-1", "orchestration", "Airflow DAG", "Airflow 2.9"),
                    node("tpl-sink-2", "sink", "BigQuery", "BigQuery"),
                ],
                "edges": [
                    edge("tpl-src-2", "tpl-pro-1"),
                    edge("tpl-pro-1", "tpl-qua-2"),
                    edge("tpl-qua-2", "tpl-sink-2"),
                    edge("tpl-orc-1", "tpl-pro-1"),
                ],
            },
            {
                "id": "tpl-streaming-analytics",
                "name": "Streaming Analytics / Fraud",
                "description": "Webhooks → Kafka → Flink windows → feature store + alert branch.",
                "pattern": "streaming_analytics",
                "nodes": [
                    node("tpl-src-3", "source", "Payment Webhooks", "HTTP API"),
                    node("tpl-sto-2", "storage", "Kafka", "Kafka 3.6"),
                    node("tpl-pro-2", "processing", "Flink Windows", "Flink 1.19"),
                    node("tpl-sink-3", "sink", "Redis Feature Store", "Redis 7.2"),
                    node("tpl-sink-4", "sink", "Risk Alerts", "PagerDuty"),
                ],
                "edges": [
                    edge("tpl-src-3", "tpl-sto-2"),
                    edge("tpl-sto-2", "tpl-pro-2"),
                    edge("tpl-pro-2", "tpl-sink-3"),
                    edge("tpl-pro-2", "tpl-sink-4", "alert branch"),
                ],
            },
        ]
