"""
Airflow Service — Airflow REST API client for DAG management and monitoring.

Supports triggering DAG runs, checking DAG status, and listing DAGs
via the Airflow Stable REST API.
"""

import logging
from typing import Dict, Any, List, Optional
import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class AirflowService:
    """Client for the Airflow REST API."""

    def __init__(self):
        self.base_url = settings.AIRFLOW_URL
        self.auth = None
        if settings.AIRFLOW_USERNAME and settings.AIRFLOW_PASSWORD:
            self.auth = (settings.AIRFLOW_USERNAME, settings.AIRFLOW_PASSWORD)

    async def _request(self, method: str, path: str, json_data: Optional[Dict] = None) -> Dict:
        """Make an HTTP request to the Airflow API."""
        if not self.base_url:
            return {"error": "Airflow URL not configured"}
        url = f"{self.base_url.rstrip('/')}/api/v1/{path.lstrip('/')}"
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.request(method, url, json=json_data, auth=self.auth)
                resp.raise_for_status()
                return resp.json() if resp.content else {}
        except Exception as e:
            logger.error("Airflow API request failed (%s %s): %s", method, path, e)
            return {"error": str(e)}

    async def list_dags(self, limit: int = 100) -> List[Dict]:
        """List all DAGs in Airflow."""
        result = await self._request("GET", f"dags?limit={limit}")
        return result.get("dags", [])

    async def trigger_dag(self, dag_id: str, conf: Optional[Dict] = None) -> Dict:
        """Trigger a DAG run."""
        return await self._request("POST", f"dags/{dag_id}/dagRuns", json_data={"conf": conf or {}})

    async def get_dag_status(self, dag_id: str, dag_run_id: str) -> Dict:
        """Get the status of a specific DAG run."""
        return await self._request("GET", f"dags/{dag_id}/dagRuns/{dag_run_id}")

    async def pause_dag(self, dag_id: str) -> Dict:
        """Pause a DAG."""
        return await self._request("PATCH", f"dags/{dag_id}", json_data={"is_paused": True})

    async def unpause_dag(self, dag_id: str) -> Dict:
        """Unpause a DAG."""
        return await self._request("PATCH", f"dags/{dag_id}", json_data={"is_paused": False})


airflow_service = AirflowService()
