"""
Airflow Connector v2 — Enhanced with Pydantic validation, retries, timeouts, and audit logging.

Wraps the Airflow REST API via the Tool Gateway with full operational support.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

import httpx
from pydantic import BaseModel, Field

from app.tools.connector_base_v2 import (
    BaseConnector,
    ToolCategory,
    ToolStatus,
    ConnectorResult,
    ConnectorHealth,
    classify_mutation,
    mask_credentials,
)

logger = logging.getLogger(__name__)


# ── Pydantic Input Schemas ──────────────────────────────────────────

class AirflowTriggerParams(BaseModel):
    dag_id: str = Field(..., description="The DAG ID to trigger")
    conf: Dict[str, Any] = Field(default_factory=dict, description="Configuration dict for the DAG run")
    execution_date: Optional[str] = Field(None, description="Optional execution date (ISO 8601)")


class AirflowPauseParams(BaseModel):
    dag_id: str = Field(..., description="The DAG ID to pause/unpause")
    is_paused: bool = Field(True, description="True to pause, False to unpause")


class AirflowDagRunParams(BaseModel):
    dag_id: str = Field(..., description="The DAG ID")
    dag_run_id: Optional[str] = Field(None, description="Specific run ID, or latest")


# ── Connector ───────────────────────────────────────────────────────

class AirflowConnectorV2(BaseConnector):
    """Enhanced Apache Airflow connector with retries, validation, and audit logging."""

    name = "airflow"
    display_name = "Apache Airflow"
    category = ToolCategory.ORCHESTRATOR
    icon = "airflow"
    description = "Orchestrate data pipelines with Apache Airflow DAGs"

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        cfg = config or {}
        self._base_url: str = cfg.get("base_url", "") or cfg.get("AIRFLOW_URL", "")
        self._auth: Optional[tuple] = None

        username = cfg.get("username", "") or cfg.get("AIRFLOW_USERNAME", "")
        password = cfg.get("password", "") or cfg.get("AIRFLOW_PASSWORD", "")
        if username and password:
            self._auth = (username, password)

        self._capabilities = [
            "list_dags",
            "trigger_dag",
            "pause_dag",
            "unpause_dag",
            "get_dag_status",
            "get_dag_run",
            "get_dag_logs",
            "get_task_instances",
            "get_health",
            "list_pools",
            "list_connections",
            "test_connection",
        ]

    # ── Internal HTTP helper ────────────────────────────────────────

    async def _request(
        self,
        method: str,
        path: str,
        json_data: Optional[Dict] = None,
        timeout: int = 30,
    ) -> Dict[str, Any]:
        if not self._base_url:
            raise ValueError("Airflow URL not configured")

        url = f"{self._base_url.rstrip('/')}/api/v1/{path.lstrip('/')}"

        async def _do():
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.request(
                    method, url, json=json_data, auth=self._auth
                )
                resp.raise_for_status()
                return resp.json() if resp.content else {}

        return await self._retry(_do)

    # ── Public interface ────────────────────────────────────────────

    async def test(self) -> ConnectorResult:
        start = datetime.utcnow()
        action = "test"
        try:
            if not self._base_url:
                self._status = ToolStatus.DISCONNECTED
                return ConnectorResult(
                    success=False,
                    error="Airflow URL not configured",
                    tool_name=self.name,
                    action=action,
                )

            result = await self._request("GET", "health")
            self._status = ToolStatus.CONNECTED
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            cr = ConnectorResult(
                success=True,
                data=result,
                tool_name=self.name,
                action=action,
                read_only=True,
                execution_time_ms=ms,
            )
            self._record_audit(action, True, True, ms)
            return cr
        except Exception as e:
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            self._status = ToolStatus.ERROR
            self._record_audit(action, True, False, ms, str(e))
            return ConnectorResult(
                success=False,
                error=str(e),
                tool_name=self.name,
                action=action,
            )

    async def health(self) -> ConnectorHealth:
        start = datetime.utcnow()
        try:
            result = await self._request("GET", "health")
            metadata = result.get("metadata", {})
            scheduler = metadata.get("scheduler", {})
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            return ConnectorHealth(
                status="healthy" if scheduler.get("status") == "healthy" else "degraded",
                latency_ms=ms,
                details={
                    "scheduler_status": scheduler.get("status", "unknown"),
                    "latest_dag_version": scheduler.get("latest_dag_version"),
                },
            )
        except Exception as e:
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            return ConnectorHealth(status="error", latency_ms=ms, details={"error": str(e)})

    async def list_resources(self, resource_type: str = "dags") -> ConnectorResult:
        start = datetime.utcnow()
        action = f"list_{resource_type}"
        read_only = True
        try:
            if resource_type == "dags":
                result = await self._request("GET", "dags?limit=200")
                data = result.get("dags", [])
            elif resource_type == "pools":
                result = await self._request("GET", "pools")
                data = result.get("pools", [])
            elif resource_type == "connections":
                result = await self._request("GET", "connections")
                data = result.get("connections", [])
            else:
                data = []

            ms = (datetime.utcnow() - start).total_seconds() * 1000
            self._record_audit(action, read_only, True, ms)
            return ConnectorResult(
                success=True, data=data, tool_name=self.name, action=action,
                read_only=read_only, execution_time_ms=ms,
            )
        except Exception as e:
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            self._record_audit(action, read_only, False, ms, str(e))
            return ConnectorResult(
                success=False, error=str(e), tool_name=self.name, action=action,
            )

    async def get_resource(self, resource_type: str, resource_id: str) -> ConnectorResult:
        start = datetime.utcnow()
        action = f"get_{resource_type}"
        try:
            if resource_type == "dag":
                data = await self._request("GET", f"dags/{resource_id}")
            elif resource_type == "dag_run":
                data = await self._request("GET", f"dags/{resource_id}/dagRuns/-1")
            else:
                data = {}

            ms = (datetime.utcnow() - start).total_seconds() * 1000
            self._record_audit(action, True, True, ms)
            return ConnectorResult(
                success=True, data=data, tool_name=self.name, action=action,
                read_only=True, execution_time_ms=ms,
            )
        except Exception as e:
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            self._record_audit(action, True, False, ms, str(e))
            return ConnectorResult(
                success=False, error=str(e), tool_name=self.name, action=action,
            )

    async def execute(self, action: str, params: Dict[str, Any], dry_run: bool = False) -> ConnectorResult:
        start = datetime.utcnow()
        read_only = classify_mutation(action)

        try:
            if action == "trigger_dag":
                validated = AirflowTriggerParams(**params)
                if dry_run:
                    return ConnectorResult(
                        success=True,
                        data={"dry_run": True, "would_trigger": validated.dag_id},
                        tool_name=self.name, action=action, read_only=read_only,
                    )
                data = await self._request(
                    "POST", f"dags/{validated.dag_id}/dagRuns",
                    json_data={"conf": validated.conf},
                )
            elif action == "pause_dag":
                validated = AirflowPauseParams(**params)
                if dry_run:
                    return ConnectorResult(
                        success=True,
                        data={"dry_run": True, "would_pause": validated.dag_id, "paused": validated.is_paused},
                        tool_name=self.name, action=action, read_only=read_only,
                    )
                data = await self._request(
                    "PATCH", f"dags/{validated.dag_id}",
                    json_data={"is_paused": validated.is_paused},
                )
            elif action == "unpause_dag":
                validated = AirflowPauseParams(dag_id=params.get("dag_id", ""), is_paused=False)
                data = await self._request(
                    "PATCH", f"dags/{validated.dag_id}",
                    json_data={"is_paused": False},
                )
            else:
                ms = (datetime.utcnow() - start).total_seconds() * 1000
                self._record_audit(action, read_only, False, ms, f"Unknown action: {action}")
                return ConnectorResult(
                    success=False, error=f"Unknown action: {action}",
                    tool_name=self.name, action=action,
                )

            ms = (datetime.utcnow() - start).total_seconds() * 1000
            self._record_audit(action, read_only, True, ms)
            return ConnectorResult(
                success=True, data=data, tool_name=self.name, action=action,
                read_only=read_only, execution_time_ms=ms,
            )
        except Exception as e:
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            self._record_audit(action, read_only, False, ms, str(e))
            return ConnectorResult(
                success=False, error=str(e), tool_name=self.name, action=action,
            )

    async def get_logs(self, resource_type: str, resource_id: str, limit: int = 50) -> ConnectorResult:
        start = datetime.utcnow()
        action = f"logs_{resource_type}"
        try:
            if resource_type == "dag_run":
                result = await self._request("GET", f"dags/{resource_id}/dagRuns/-1/taskInstances")
                tasks = result.get("task_instances", [])
                data = [
                    {
                        "task_id": t.get("task_id"),
                        "state": t.get("state"),
                        "start_date": t.get("start_date"),
                        "end_date": t.get("end_date"),
                        "try_number": t.get("try_number"),
                    }
                    for t in tasks[:limit]
                ]
            else:
                data = []

            ms = (datetime.utcnow() - start).total_seconds() * 1000
            self._record_audit(action, True, True, ms)
            return ConnectorResult(
                success=True, data=data, tool_name=self.name, action=action,
                read_only=True, execution_time_ms=ms,
            )
        except Exception as e:
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            self._record_audit(action, True, False, ms, str(e))
            return ConnectorResult(
                success=False, error=str(e), tool_name=self.name, action=action,
            )

    async def get_metrics(self) -> ConnectorResult:
        start = datetime.utcnow()
        action = "metrics"
        try:
            dags_result = await self.list_resources("dags")
            dags = dags_result.data or []
            total = len(dags)
            active = sum(1 for d in dags if not d.get("is_paused", False))
            paused = total - active

            ms = (datetime.utcnow() - start).total_seconds() * 1000
            data = {
                "total_dags": total,
                "active_dags": active,
                "paused_dags": paused,
                "status": self._status.value,
            }
            self._record_audit(action, True, True, ms)
            return ConnectorResult(
                success=True, data=data, tool_name=self.name, action=action,
                read_only=True, execution_time_ms=ms,
            )
        except Exception as e:
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            self._record_audit(action, True, False, ms, str(e))
            return ConnectorResult(
                success=False, error=str(e), tool_name=self.name, action=action,
            )


airflow_connector_v2 = AirflowConnectorV2()
