"""
Spark Connector v2 — Enhanced with Pydantic validation, retries, timeouts, and audit logging.

Wraps Spark REST API (Livy + Master UI) via the Tool Gateway.
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
)

logger = logging.getLogger(__name__)


# ── Pydantic Input Schemas ──────────────────────────────────────────

class SparkSubmitParams(BaseModel):
    file: str = Field(..., min_length=1, description="Path to the JAR/py file to submit")
    className: Optional[str] = Field(None, description="Main class for JAR submissions")
    args: List[str] = Field(default_factory=list, description="Arguments to pass")
    driver_memory: Optional[str] = Field(None, description="Driver memory (e.g. '2g')")
    executor_memory: Optional[str] = Field(None, description="Executor memory (e.g. '4g')")


# ── Connector ───────────────────────────────────────────────────────

class SparkConnectorV2(BaseConnector):
    """Enhanced Apache Spark connector with retries, validation, and audit logging."""

    name = "spark"
    display_name = "Apache Spark"
    category = ToolCategory.COMPUTE_ENGINE
    icon = "spark"
    description = "Process large-scale data with Apache Spark"

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        cfg = config or {}
        self._master_url: str = cfg.get("master_url", "http://localhost:8080")
        self._livy_url: str = cfg.get("livy_url", "http://localhost:8998")
        self._capabilities = [
            "list_jobs",
            "submit_job",
            "get_job_status",
            "get_logs",
            "get_metrics",
            "get_cluster_info",
            "list_applications",
            "kill_job",
        ]

    async def _master_request(self, path: str) -> Dict[str, Any]:
        async def _do():
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(f"{self._master_url.rstrip('/')}/{path.lstrip('/')}")
                resp.raise_for_status()
                return resp.json()
        return await self._retry(_do)

    async def _livy_request(
        self, method: str, path: str, json_data: Optional[Dict] = None, timeout: int = 15,
    ) -> Dict[str, Any]:
        async def _do():
            async with httpx.AsyncClient(timeout=timeout) as client:
                url = f"{self._livy_url.rstrip('/')}/api/v1/{path.lstrip('/')}"
                resp = await client.request(method, url, json=json_data)
                resp.raise_for_status()
                return resp.json() if resp.content else {}
        return await self._retry(_do)

    # ── Public interface ────────────────────────────────────────────

    async def test(self) -> ConnectorResult:
        start = datetime.utcnow()
        action = "test"
        try:
            data = await self._master_request("json/")
            self._status = ToolStatus.CONNECTED
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            self._record_audit(action, True, True, ms)
            return ConnectorResult(
                success=True,
                data={
                    "connected": True,
                    "workers": data.get("workers", 0),
                    "cores": data.get("cores", 0),
                    "url": self._master_url,
                },
                tool_name=self.name, action=action, read_only=True, execution_time_ms=ms,
            )
        except Exception as e:
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            self._status = ToolStatus.DISCONNECTED
            self._record_audit(action, True, False, ms, str(e))
            return ConnectorResult(
                success=False, error=str(e), tool_name=self.name, action=action,
            )

    async def health(self) -> ConnectorHealth:
        start = datetime.utcnow()
        try:
            data = await self._master_request("json/")
            alive = data.get("aliveworkers", 0)
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            return ConnectorHealth(
                status="healthy" if alive > 0 else "degraded",
                latency_ms=ms,
                details={
                    "workers": alive,
                    "cores": data.get("cores", 0),
                    "memory": data.get("memory", 0),
                    "status": data.get("status", "unknown"),
                },
            )
        except Exception as e:
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            return ConnectorHealth(status="error", latency_ms=ms, details={"error": str(e)})

    async def list_resources(self, resource_type: str = "jobs") -> ConnectorResult:
        start = datetime.utcnow()
        action = f"list_{resource_type}"
        try:
            data: List[Dict] = []
            if resource_type == "jobs":
                result = await self._livy_request("GET", "batches?state=all")
                data = result.get("sessions", [])
            elif resource_type == "applications":
                try:
                    app_data = await self._master_request("json/")
                    data = app_data.get("activeapps", []) + app_data.get("completedapps", [])
                except Exception:
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

    async def get_resource(self, resource_type: str, resource_id: str) -> ConnectorResult:
        start = datetime.utcnow()
        action = f"get_{resource_type}"
        try:
            data: Any = {}
            if resource_type == "job":
                data = await self._livy_request("GET", f"batches/{resource_id}")
            elif resource_type == "application":
                try:
                    app_data = await self._master_request("json/")
                    for app in app_data.get("activeapps", []) + app_data.get("completedapps", []):
                        if app.get("id") == resource_id:
                            data = app
                            break
                except Exception:
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
            if action == "submit_job":
                validated = SparkSubmitParams(**params)
                if dry_run:
                    ms = (datetime.utcnow() - start).total_seconds() * 1000
                    return ConnectorResult(
                        success=True,
                        data={"dry_run": True, "would_submit": validated.file},
                        tool_name=self.name, action=action, read_only=False, execution_time_ms=ms,
                    )
                payload = {"file": validated.file}
                if validated.className:
                    payload["className"] = validated.className
                if validated.args:
                    payload["args"] = validated.args
                data = await self._livy_request("POST", "batches", json_data=payload, timeout=30)
                ms = (datetime.utcnow() - start).total_seconds() * 1000
                self._record_audit(action, read_only, True, ms)
                return ConnectorResult(
                    success=True, data={"batch_id": data.get("id"), "state": data.get("state")},
                    tool_name=self.name, action=action, read_only=read_only, execution_time_ms=ms,
                )

            elif action == "kill_job":
                batch_id = params.get("batch_id", "")
                data = await self._livy_request("DELETE", f"batches/{batch_id}")
                ms = (datetime.utcnow() - start).total_seconds() * 1000
                self._record_audit(action, read_only, True, ms)
                return ConnectorResult(
                    success=True, data=data, tool_name=self.name, action=action,
                    read_only=read_only, execution_time_ms=ms,
                )

            else:
                ms = (datetime.utcnow() - start).total_seconds() * 1000
                self._record_audit(action, read_only, False, ms, f"Unknown action: {action}")
                return ConnectorResult(
                    success=False, error=f"Unknown action: {action}",
                    tool_name=self.name, action=action,
                )
        except Exception as e:
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            self._record_audit(action, read_only, False, ms, str(e))
            return ConnectorResult(
                success=False, error=str(e), tool_name=self.name, action=action,
            )

    async def get_logs(self, resource_type: str, resource_id: str, limit: int = 50) -> ConnectorResult:
        start = datetime.utcnow()
        action = "logs"
        try:
            if resource_type == "job":
                result = await self._livy_request(
                    "GET", f"batches/{resource_id}/logs", timeout=10,
                )
                log_lines = result.get("log", [])
                data = [{"line": i, "text": line} for i, line in enumerate(log_lines[-limit:])]
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
            health = await self.health()
            details = health.details or {}
            data = {
                "workers": details.get("workers", 0),
                "cores": details.get("cores", 0),
                "memory": details.get("memory", 0),
                "status": self._status.value,
            }
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


spark_connector_v2 = SparkConnectorV2()
