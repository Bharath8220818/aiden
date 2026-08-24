"""
Airflow Connector — wraps the Airflow REST API via the Tool Gateway.

Capabilities: list_dags, trigger_dag, pause_dag, get_logs, get_status
"""

import logging
from typing import Dict, Any, List, Optional

import httpx

from app.tools.connector_base import ToolConnector, ToolCategory, ToolStatus
from app.config import settings

logger = logging.getLogger(__name__)


class AirflowConnector(ToolConnector):
    name = "airflow"
    display_name = "Apache Airflow"
    category = ToolCategory.ORCHESTRATOR
    icon = "🌬️"
    description = "Orchestrate data pipelines with Apache Airflow DAGs"

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        self.base_url = self.config.get("base_url") or getattr(settings, "AIRFLOW_URL", "")
        self.auth = None
        username = self.config.get("username") or getattr(settings, "AIRFLOW_USERNAME", "")
        password = self.config.get("password") or getattr(settings, "AIRFLOW_PASSWORD", "")
        if username and password:
            self.auth = (username, password)
        self._capabilities = [
            "list_dags", "trigger_dag", "pause_dag", "unpause_dag",
            "get_dag_status", "get_logs", "get_health",
        ]

    async def _request(self, method: str, path: str, json_data: Optional[Dict] = None) -> Dict:
        if not self.base_url:
            return {"error": "Airflow URL not configured"}
        url = f"{self.base_url.rstrip('/')}/api/v1/{path.lstrip('/')}"
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.request(method, url, json=json_data, auth=self.auth)
                resp.raise_for_status()
                return resp.json() if resp.content else {}
        except Exception as e:
            logger.error("Airflow API error (%s %s): %s", method, path, e)
            return {"error": str(e)}

    async def test(self) -> Dict[str, Any]:
        if not self.base_url:
            self._status = ToolStatus.DISCONNECTED
            return {"connected": False, "message": "Airflow URL not configured"}
        try:
            result = await self._request("GET", "health")
            if "error" in result:
                self._status = ToolStatus.ERROR
                return {"connected": False, "message": result["error"]}
            self._status = ToolStatus.CONNECTED
            return {"connected": True, "message": "Airflow is healthy", "details": result}
        except Exception as e:
            self._status = ToolStatus.ERROR
            return {"connected": False, "message": str(e)}

    async def health(self) -> Dict[str, Any]:
        result = await self._request("GET", "health")
        if "error" in result:
            return {"status": "error", "details": result}
        metadata = result.get("metadata", {})
        scheduler = metadata.get("scheduler", {})
        return {
            "status": "healthy" if scheduler.get("status") == "healthy" else "degraded",
            "details": {
                "scheduler_status": scheduler.get("status", "unknown"),
                "latest_dag_version": scheduler.get("latest_dag_version"),
            },
        }

    async def list(self, resource_type: str = "dags") -> List[Dict[str, Any]]:
        if resource_type == "dags":
            result = await self._request("GET", "dags?limit=200")
            return result.get("dags", [])
        elif resource_type == "pools":
            result = await self._request("GET", "pools")
            return result.get("pools", [])
        elif resource_type == "connections":
            result = await self._request("GET", "connections")
            return result.get("connections", [])
        return []

    async def get(self, resource_type: str, resource_id: str) -> Dict[str, Any]:
        if resource_type == "dag":
            return await self._request("GET", f"dags/{resource_id}")
        elif resource_type == "dag_run":
            return await self._request("GET", f"dags/{resource_id}/dagRuns/-1")
        return {}

    async def execute(self, action: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        params = params or {}
        if action == "trigger_dag":
            dag_id = params.get("dag_id", "")
            conf = params.get("conf", {})
            return await self._request("POST", f"dags/{dag_id}/dagRuns", json_data={"conf": conf})
        elif action == "pause_dag":
            return await self._request("PATCH", f"dags/{params.get('dag_id', '')}", json_data={"is_paused": True})
        elif action == "unpause_dag":
            return await self._request("PATCH", f"dags/{params.get('dag_id', '')}", json_data={"is_paused": False})
        return {"error": f"Unknown action: {action}"}

    async def logs(self, resource_type: str, resource_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        if resource_type == "dag_run":
            result = await self._request("GET", f"dags/{resource_id}/dagRuns/-1/taskInstances")
            tasks = result.get("task_instances", [])
            return [{"task_id": t.get("task_id"), "state": t.get("state"), "start_date": t.get("start_date")} for t in tasks[:limit]]
        return []

    async def metrics(self) -> Dict[str, Any]:
        dags = await self.list("dags")
        total = len(dags)
        active = sum(1 for d in dags if not d.get("is_paused", False))
        failed = sum(1 for d in dags if d.get("is_paused", False))
        return {
            "total_dags": total,
            "active_dags": active,
            "paused_dags": failed,
            "status": self._status.value,
        }


airflow_connector = AirflowConnector()
