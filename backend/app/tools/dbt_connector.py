"""
dbt Connector — wraps dbt Core CLI operations via the Tool Gateway.

Capabilities: list_models, run_model, test_model, get_lineage, get_run_results
"""

import logging
import asyncio
from typing import Dict, Any, List, Optional

from app.tools.connector_base import ToolConnector, ToolCategory, ToolStatus

logger = logging.getLogger(__name__)


class DbtConnector(ToolConnector):
    name = "dbt"
    display_name = "dbt"
    category = ToolCategory.TRANSFORMER
    icon = "🔧"
    description = "Transform data with dbt models, tests, and documentation"

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        self.project_dir = self.config.get("project_dir", ".")
        self.profiles_dir = self.config.get("profiles_dir", "~/.dbt")
        self._capabilities = [
            "list_models", "run_model", "test_model",
            "get_lineage", "get_run_results", "get_catalog",
        ]

    async def _run_dbt(self, args: List[str], timeout: int = 120) -> Dict[str, Any]:
        """Run a dbt command and return parsed output."""
        cmd = ["dbt"] + args + ["--project-dir", self.project_dir, "--profiles-dir", self.profiles_dir]
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
            return {
                "success": proc.returncode == 0,
                "returncode": proc.returncode,
                "stdout": stdout.decode(errors="replace"),
                "stderr": stderr.decode(errors="replace"),
            }
        except asyncio.TimeoutError:
            return {"success": False, "error": "dbt command timed out"}
        except FileNotFoundError:
            return {"success": False, "error": "dbt not found in PATH"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def test(self) -> Dict[str, Any]:
        result = await self._run_dbt(["--version"], timeout=10)
        if result.get("success"):
            self._status = ToolStatus.CONNECTED
            return {"connected": True, "message": "dbt is available", "version": result.get("stdout", "").strip()}
        self._status = ToolStatus.ERROR
        return {"connected": False, "message": result.get("error", "dbt not available")}

    async def health(self) -> Dict[str, Any]:
        result = await self._run_dbt(["debug", "--no-send-anonymous-usage-stats"], timeout=30)
        return {
            "status": "healthy" if result.get("success") else "error",
            "details": {"connection": "ok" if result.get("success") else "failed"},
        }

    async def list(self, resource_type: str = "models") -> List[Dict[str, Any]]:
        if resource_type == "models":
            result = await self._run_dbt(["ls", "--resource-type", "model", "--output", "json"], timeout=30)
            if result.get("success"):
                lines = result.get("stdout", "").strip().split("\n")
                models = []
                for line in lines:
                    try:
                        import json
                        models.append(json.loads(line))
                    except Exception:
                        if line.strip():
                            models.append({"name": line.strip(), "package": "unknown"})
                return models
        elif resource_type == "tests":
            result = await self._run_dbt(["ls", "--resource-type", "test", "--output", "json"], timeout=30)
            if result.get("success"):
                return [{"name": l.strip()} for l in result.get("stdout", "").strip().split("\n") if l.strip()]
        elif resource_type == "sources":
            result = await self._run_dbt(["ls", "--resource-type", "source", "--output", "json"], timeout=30)
            if result.get("success"):
                return [{"name": l.strip()} for l in result.get("stdout", "").strip().split("\n") if l.strip()]
        return []

    async def get(self, resource_type: str, resource_id: str) -> Dict[str, Any]:
        if resource_type == "model":
            result = await self._run_dbt(["ls", "--select", resource_id, "--output", "json"], timeout=15)
            if result.get("success"):
                stdout = result.get("stdout", "").strip()
                if stdout:
                    try:
                        import json
                        return json.loads(stdout.split("\n")[0])
                    except Exception:
                        return {"name": resource_id}
        return {}

    async def execute(self, action: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        params = params or {}
        if action == "run":
            select = params.get("select", "")
            args = ["run"]
            if select:
                args += ["--select", select]
            result = await self._run_dbt(args, timeout=300)
            return {"success": result.get("success"), "output": result.get("stdout", "")[-2000:]}
        elif action == "test":
            select = params.get("select", "")
            args = ["test"]
            if select:
                args += ["--select", select]
            result = await self._run_dbt(args, timeout=300)
            return {"success": result.get("success"), "output": result.get("stdout", "")[-2000:]}
        elif action == "seed":
            result = await self._run_dbt(["seed"], timeout=300)
            return {"success": result.get("success"), "output": result.get("stdout", "")[-2000:]}
        return {"error": f"Unknown action: {action}"}

    async def logs(self, resource_type: str, resource_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        result = await self._run_dbt(["run", "--select", resource_id, "--no-version-check"], timeout=120)
        stdout = result.get("stdout", "")
        lines = stdout.split("\n")[-limit:]
        return [{"line": i, "text": line} for i, line in enumerate(lines) if line.strip()]

    async def metrics(self) -> Dict[str, Any]:
        models = await self.list("models")
        tests = await self.list("tests")
        return {
            "total_models": len(models),
            "total_tests": len(tests),
            "status": self._status.value,
        }


dbt_connector = DbtConnector()
