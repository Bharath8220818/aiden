"""Seed the AIDEN demo environment — users, workspaces, projects, pipelines.

Run from backend/:
    venv\\Scripts\\python.exe -m scripts.seed_database

The demo accounts mirror the frontend login page so that flipping the frontend
off mock mode yields the same identities:
    admin@acmedata.io / admin123    (admin)
    bharath@acmedata.io / lead123   (lead)
    engineer@acmedata.io / eng123   (engineer)
    analyst@acmedata.io / view123   (viewer)
"""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal, engine
from app.core.security import hash_password
from app.models import (
    Approval,
    Architecture,
    AuditLog,
    Incident,
    Pipeline,
    PipelineRun,
    Project,
    Requirement,
    User,
    UserRole,
    Workspace,
    WorkspaceMember,
    WorkspaceRole,
)

DEMO_USERS = [
    {
        "email": "admin@acmedata.io",
        "password": "admin123",
        "full_name": "Ava Chen",
        "role": UserRole.admin,
    },
    {
        "email": "bharath@acmedata.io",
        "password": "lead123",
        "full_name": "Bharath",
        "role": UserRole.lead,
    },
    {
        "email": "engineer@acmedata.io",
        "password": "eng123",
        "full_name": "Maya Rodriguez",
        "role": UserRole.engineer,
    },
    {
        "email": "analyst@acmedata.io",
        "password": "view123",
        "full_name": "Sam Okafor",
        "role": UserRole.viewer,
    },
]

WORKSPACES = [
    {
        "name": "Acme Data Platform",
        "slug": "acme-data-platform",
        "description": "Core enterprise data platform for Acme Corp.",
    },
    {
        "name": "Retail Analytics",
        "slug": "retail-analytics",
        "description": "Retail performance, sales & inventory analytics.",
    },
    {
        "name": "Customer 360",
        "slug": "customer-360",
        "description": "Unified customer profile and engagement platform.",
    },
    {
        "name": "Real-Time Fraud Detection",
        "slug": "real-time-fraud-detection",
        "description": "Streaming fraud scoring and risk alerting.",
    },
]

PROJECTS = [
    (
        "acme-data-platform",
        "Orders CDC Replication",
        "Replicate orders from PostgreSQL to Snowflake via CDC.",
    ),
    ("acme-data-platform", "Payments Data Mart", "Curated payments datamart for finance."),
    ("retail-analytics", "Sales Daily ETL", "Daily aggregation of sales transactions."),
    ("retail-analytics", "Inventory Sync", "Near-real-time inventory synchronization."),
    ("customer-360", "Customer Profile Merge", "Identity resolution across sources."),
    ("real-time-fraud-detection", "Fraud Velocity Stream", "Low-latency fraud detection stream."),
]

COLUMNS = [
    {"name": "order_id", "type": "STRING", "nullable": False, "primary_key": True},
    {"name": "customer_id", "type": "STRING", "nullable": False},
    {"name": "amount", "type": "DECIMAL(12,2)", "nullable": False},
    {"name": "status", "type": "STRING", "nullable": False},
    {"name": "created_at", "type": "TIMESTAMP", "nullable": False},
]

QA_RULES = [
    {"rule": "uniqueness", "column": "order_id", "expectation": "no_duplicates"},
    {"rule": "not_null", "column": "customer_id"},
    {"rule": "range", "column": "amount", "min": 0},
]


async def clear(db: AsyncSession) -> None:
    for model in (
        AuditLog,
        Approval,
        Incident,
        PipelineRun,
        Pipeline,
        Architecture,
        Requirement,
        Project,
        WorkspaceMember,
        Workspace,
        User,
    ):
        await db.execute(model.__table__.delete())
    await db.commit()


async def seed(db: AsyncSession) -> None:
    await clear(db)

    users: dict[str, User] = {}
    for spec in DEMO_USERS:
        user = User(
            email=spec["email"],
            full_name=spec["full_name"],
            password_hash=hash_password(spec["password"]),
            role=spec["role"],
            is_active=True,
        )
        db.add(user)
        users[spec["role"].value] = user
    await db.flush()

    lead = users["lead"]
    workspaces: dict[str, Workspace] = {}
    for spec in WORKSPACES:
        ws = Workspace(
            name=spec["name"],
            slug=spec["slug"],
            description=spec["description"],
        )
        db.add(ws)
        workspaces[spec["slug"]] = ws
    await db.flush()

    # Membership: each workspace gets the admin + lead as owners, engineer as member,
    # analyst as viewer in the first two workspaces.
    for ws in workspaces.values():
        db.add(WorkspaceMember(workspace_id=ws.id, user_id=users["admin"].id, role=WorkspaceRole.owner))
        db.add(WorkspaceMember(workspace_id=ws.id, user_id=users["lead"].id, role=WorkspaceRole.owner))
        db.add(WorkspaceMember(workspace_id=ws.id, user_id=users["engineer"].id, role=WorkspaceRole.member))
        if ws.slug in {"acme-data-platform", "retail-analytics"}:
            db.add(WorkspaceMember(workspace_id=ws.id, user_id=users["viewer"].id, role=WorkspaceRole.viewer))
    await db.flush()

    projects = {}
    for slug, name, desc in PROJECTS:
        project = Project(
            workspace_id=workspaces[slug].id,
            name=name,
            description=desc,
            created_by=lead.id,
        )
        db.add(project)
        projects[name] = project
    await db.flush()

    # Requirements
    req_map = {
        "Orders CDC Replication": "Streaming CDC replication of orders with a 15-minute freshness SLA.",
        "Fraud Velocity Stream": "Detect fraud signals with sub-250ms event-latency SLA.",
    }
    for name, desc in req_map.items():
        project = projects[name]
        db.add(
            Requirement(
                project_id=project.id,
                title=f"Requirement: {name}",
                description=desc,
                intent_analysis={
                    "pattern": "streaming_cdc",
                    "confidence": 0.96,
                    "entities": {"sources": 1, "targets": 1},
                    "pii_detected": True,
                },
                data_contract={
                    "name": f"{name.lower().replace(' ', '_')}_contract",
                    "version": "1.0.0",
                    "columns": COLUMNS,
                    "quality_rules": QA_RULES,
                    "sla": {"freshness_minutes": 15, "availability": "99.95%"},
                },
                status="validated",
                created_by=lead.id,
            )
        )

    # Architectures — stored in the React Flow shape the /architecture/blueprint
    # endpoint serves (flat {id, kind, label} blobs are legacy; the endpoint
    # normalizes them, but the seed should use the contract shape directly).
    architecture_blueprint = {
        "nodes": [
            {
                "id": "n1",
                "type": "architecture",
                "position": {"x": 80, "y": 60},
                "data": {
                    "label": "PostgreSQL",
                    "kind": "source",
                    "status": "idle",
                    "technology": "PostgreSQL 15",
                    "description": "Orders OLTP database streaming changes via WAL.",
                    "metrics": [{"label": "WAL lag", "value": "< 1s"}],
                },
            },
            {
                "id": "n2",
                "type": "architecture",
                "position": {"x": 340, "y": 60},
                "data": {
                    "label": "Debezium",
                    "kind": "ingestion",
                    "status": "idle",
                    "technology": "Debezium 2.5",
                    "description": "CDC connector replicating row changes onto Kafka.",
                    "metrics": [{"label": "Throughput", "value": "2.1k evt/s"}],
                },
            },
            {
                "id": "n3",
                "type": "architecture",
                "position": {"x": 600, "y": 60},
                "data": {
                    "label": "Kafka",
                    "kind": "processing",
                    "status": "idle",
                    "technology": "Kafka 3.6",
                    "description": "Durable event bus with PII masking in the stream processor.",
                    "metrics": [{"label": "Partitions", "value": "6"}],
                },
            },
            {
                "id": "n4",
                "type": "architecture",
                "position": {"x": 860, "y": 60},
                "data": {
                    "label": "Snowflake MART",
                    "kind": "sink",
                    "status": "idle",
                    "technology": "Snowflake Enterprise",
                    "description": "Curated orders mart consumed by analytics.",
                    "metrics": [{"label": "Freshness", "value": "< 5 min"}],
                },
            },
        ],
        "edges": [
            {"id": "e1", "source": "n1", "target": "n2", "animated": True},
            {"id": "e2", "source": "n2", "target": "n3", "animated": True},
            {"id": "e3", "source": "n3", "target": "n4", "animated": True},
        ],
    }
    orders = projects["Orders CDC Replication"]
    db.add(
        Architecture(
            project_id=orders.id,
            name="Orders CDC Blueprint",
            description="PostgreSQL → Debezium → Kafka → Snowflake",
            blueprint=architecture_blueprint,
            status="validated",
            generated_from="Streaming CDC for orders with PII masking",
            created_by=lead.id,
        )
    )

    # Pipelines + runs
    now = datetime.now(UTC)
    pipeline_specs = [
        ("orders_cdc_v1", "Orders CDC Replication", "streaming", "active"),
        ("sales_daily_pipeline", "Sales Daily ETL", "batch", "active"),
        ("fraud_stream_processor", "Fraud Velocity Stream", "streaming", "active"),
        ("customer_360_etl", "Customer Profile Merge", "batch", "active"),
        ("inventory_sync", "Inventory Sync", "batch", "paused"),
    ]
    pipelines = {}
    for name, project_name, ptype, status in pipeline_specs:
        p = Pipeline(
            project_id=projects[project_name].id,
            name=name,
            description=f"{name} — {ptype} pipeline",
            pipeline_type=ptype,
            status=status,
            config={
                "mode": ptype,
                "freshness_sla_minutes": 15 if ptype == "streaming" else 1440,
                "quality_gate": True,
                "pii_masking": True,
            },
            created_by=lead.id,
        )
        db.add(p)
        pipelines[name] = p
    await db.flush()

    run_states = [("success", 2800, 12), ("success", 3100, 9), ("failed", 5200, None)]
    for p in pipelines.values():
        for i, (status, rows, cost) in enumerate(run_states):
            started = now - timedelta(hours=i + 1)
            finished = started + timedelta(minutes=18)
            db.add(
                PipelineRun(
                    pipeline_id=p.id,
                    status=status,
                    trigger_type="schedule" if i else "manual",
                    started_at=started,
                    finished_at=finished if status == "success" else None,
                    duration_ms=1080000,
                    rows_processed=rows,
                    cost=cost,
                    error=None
                    if status == "success"
                    else "Quality gate failed: uniqueness violation on order_id",
                    logs={"checks": ["extract", "quality_gate", "merge"]},
                )
            )
    await db.flush()

    # Incidents
    incident = Incident(
        project_id=orders.id,
        title="orders_cdc_v1 — quality gate failure (uniqueness)",
        severity="high",
        status="investigating",
        detection_source="quality_gate",
        root_cause={
            "category": "data_quality",
            "confidence": 0.91,
            "evidence": ["duplicate order_id", "late events from CDC"],
        },
        proposed_fix={
            "summary": "Add idempotency key + window dedup guard",
            "risk_level": "medium",
        },
    )
    db.add(incident)
    await db.flush()

    db.add(
        Approval(
            project_id=orders.id,
            incident_id=incident.id,
            request_type="healing_deploy",
            status="pending",
            summary="Deploy dedup guard to orders_cdc_v1 after sandbox verification.",
            risk_level="medium",
            requested_by=lead.id,
        )
    )

    # Audit trail
    db.add(
        AuditLog(
            workspace_id=workspaces["acme-data-platform"].id,
            project_id=orders.id,
            user_id=lead.id,
            action="pipeline.trigger",
            resource_type="pipeline",
            resource_id=str(pipelines["orders_cdc_v1"].id),
            details={"trigger": "seed", "pipeline": "orders_cdc_v1"},
        )
    )

    await db.commit()


async def main() -> None:
    async with AsyncSessionLocal() as session:
        await seed(session)
    await engine.dispose()
    print(
        "Seeded AIDEN demo database: 4 users, 4 workspaces, 6 projects, pipelines, runs, contract, blueprint, incident, approval, audit log."
    )


if __name__ == "__main__":
    asyncio.run(main())
