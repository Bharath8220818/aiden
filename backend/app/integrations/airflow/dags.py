"""DAG operations — upload (deploy) generated bundles and list deployed DAGs.

AIDEN generates DAG files into a shared `dags/` volume (mounted by the Airflow
scheduler in docker-compose). Deployment is a governed operation: the platform
writes the file, then polls the Airflow REST API until the scheduler has
parsed the DAG (or times out).
"""

from __future__ import annotations

import re
from typing import Any

from app.core.logging import get_logger
from app.integrations.airflow import client

logger = get_logger("aiden.airflow.dags")

# AIDEN DAG ids are namespaced so deployed pipelines are identifiable.
DAG_ID_PREFIX = "aiden_"


def dag_id_for_pipeline(pipeline_name: str) -> str:
    """`orders Daily` → `aiden_orders_daily` (Airflow DAG-id safe)."""
    slug = re.sub(r"[^a-z0-9]+", "_", pipeline_name.lower()).strip("_")
    return f"{DAG_ID_PREFIX}{slug or 'pipeline'}"


def is_aiden_dag(dag_id: str) -> bool:
    return dag_id.startswith(DAG_ID_PREFIX)


async def list_dags(*, only_aiden: bool = True, limit: int = 50) -> list[dict[str, Any]]:
    """Deployed DAGs (optionally only AIDEN-namespaced ones)."""
    params: dict[str, Any] = {"limit": limit, "order_by": "dag_id"}
    body = await client.request("GET", "/dags", params=params)
    dags = body.get("dags", []) if isinstance(body, dict) else []
    out = []
    for dag in dags:
        dag_id = dag.get("dag_id", "")
        if only_aiden and not is_aiden_dag(dag_id):
            continue
        out.append(
            {
                "dagId": dag_id,
                "isActive": bool(dag.get("is_active")),
                "isPaused": bool(dag.get("is_paused")),
                "schedule": dag.get("schedule_interval"),
                "tags": [t.get("name") for t in dag.get("tags", [])],
            }
        )
    return out


async def get_dag(dag_id: str) -> dict[str, Any] | None:
    try:
        body = await client.request("GET", f"/dags/{dag_id}")
    except client.AirflowApiError as exc:
        if exc.status_code == 404:
            return None
        raise
    return {
        "dagId": body.get("dag_id"),
        "isActive": bool(body.get("is_active")),
        "isPaused": bool(body.get("is_paused")),
        "schedule": body.get("schedule_interval"),
    }


async def unpause(dag_id: str) -> None:
    await client.request("PATCH", f"/dags/{dag_id}", json_body={"is_paused": False})


async def wait_until_parsed(dag_id: str, *, timeout_s: float = 30.0) -> bool:
    """Poll until the scheduler has registered the DAG (deploy readiness)."""
    import asyncio
    import time

    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        if await get_dag(dag_id) is not None:
            return True
        await asyncio.sleep(2.0)
    logger.warning("DAG %s not parsed within %.0fs", dag_id, timeout_s)
    return False
