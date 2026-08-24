"""
Spark Connector — wraps Spark REST API (Livy) via the Tool Gateway.

Capabilities: list_jobs, submit_job, get_job_status, get_logs, get_metrics
"""

import logging
from typing import Dict, Any, List, Optional

import httpx

from app.tools.connector_base import ToolConnector, ToolCategory, ToolStatus

logger = logging.getLogger(__name__)


class SparkConnector(ToolConnector):
    name = "spark"
    display_name = "Apache Spark"
    category = ToolCategory.COMPUTE_ENGINE
    icon = "✨"
    description = "Process large-scale data with Apache Spark"

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        self.master_url = self.config.get("master_url", "http://localhost:8080")
        self.livy_url = self.config.get("livy_url", "http://localhost:8998")
        self._capabilities = [
            "list_jobs", "submit_job", "get_job_status",
            "get_logs", "get_metrics", "get_cluster_info",
        ]

    async def test(self) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(f"{self.master_url}/json/")
                if resp.status_code == 200:
                    self._status = ToolStatus.CONNECTED
                    data = resp.json()
                    return {
                        "connected": True,
                        "message": "Spark master is reachable",
                        "workers": data.get("workers", 0),
                        "cores": data.get("cores", 0),
                    }
        except Exception:
            pass
        self._status = ToolStatus.DISCONNECTED
        return {"connected": False, "message": "Spark master not reachable"}

    async def health(self) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(f"{self.master_url}/json/")
                if resp.status_code == 200:
                    data = resp.json()
                    alive_workers = data.get("aliveworkers", 0)
                    return {
                        "status": "healthy" if alive_workers > 0 else "degraded",
                        "details": {
                            "workers": alive_workers,
                            "cores": data.get("cores", 0),
                            "memory": data.get("memory", 0),
                        },
                    }
        except Exception:
            pass
        return {"status": "error", "details": {"error": "Spark master unreachable"}}

    async def list(self, resource_type: str = "jobs") -> List[Dict[str, Any]]:
        if resource_type == "jobs":
            try:
                async with httpx.AsyncClient(timeout=15) as client:
                    resp = await client.get(f"{self.livy_url}/batches", params={"state": "all"})
                    if resp.status_code == 200:
                        return resp.json().get("sessions", [])
            except Exception:
                pass
        return []

    async def get(self, resource_type: str, resource_id: str) -> Dict[str, Any]:
        if resource_type == "job":
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    resp = await client.get(f"{self.livy_url}/batches/{resource_id}")
                    if resp.status_code == 200:
                        return resp.json()
            except Exception:
                pass
        return {}

    async def execute(self, action: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        params = params or {}
        if action == "submit_job":
            try:
                async with httpx.AsyncClient(timeout=30) as client:
                    resp = await client.post(f"{self.livy_url}/batches", json={
                        "file": params.get("file", ""),
                        "className": params.get("class", ""),
                        "args": params.get("args", []),
                    })
                    if resp.status_code == 201:
                        return {"success": True, "batch_id": resp.json().get("id")}
            except Exception as e:
                return {"error": str(e)}
        return {"error": f"Unknown action: {action}"}

    async def logs(self, resource_type: str, resource_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        if resource_type == "job":
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    resp = await client.get(f"{self.livy_url}/batches/{resource_id}/logs", params={"from": 0, "size": limit})
                    if resp.status_code == 200:
                        log_lines = resp.json().get("log", [])
                        return [{"line": i, "text": line} for i, line in enumerate(log_lines)]
            except Exception:
                pass
        return []

    async def metrics(self) -> Dict[str, Any]:
        health = await self.health()
        details = health.get("details", {})
        return {
            "workers": details.get("workers", 0),
            "cores": details.get("cores", 0),
            "memory": details.get("memory", 0),
            "status": self._status.value,
        }


spark_connector = SparkConnector()
