"""
dbt Connector v2 — Enhanced with Pydantic validation, retries, timeouts, and audit logging.

Wraps dbt Core CLI operations via the Tool Gateway.
"""

import logging
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime

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

class DbtRunParams(BaseModel):
    select: Optional[str] = Field(None, description="Model selection (e.g., 'my_model', '+stg_orders')")
    full_refresh: bool = Field(False, description="Perform a full refresh")
    threads: int = Field(1, ge=1, le=32, description="Number of threads")


class DbtTestParams(BaseModel):
    select: Optional[str] = Field(None, description="Model selection to test")


# ── Connector ───────────────────────────────────────────────────────

class DbtConnectorV2(BaseConnector):
    """Enhanced dbt connector with retries, validation, and audit logging."""

    name = "dbt"
    display_name = "dbt"
    category = ToolCategory.TRANSFORMER
    icon = "dbt"
    description = "Transform data with dbt models, tests, and documentation"

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        cfg = config or {}
        self._project_dir: str = cfg.get("project_dir", ".")
        self._profiles_dir: str = cfg.get("profiles_dir", "~/.dbt")
        self._capabilities = [
            "list_models",
            "list_tests",
            "list_sources",
            "run_model",
            "test_model",
            "seed",
            "get_lineage",
            "get_run_results",
            "get_catalog",
            "generate_docs",
        ]

    async def _run_dbt(self, args: List[str], timeout: int = 120) -> Dict[str, Any]:
        """Run a dbt command with retry support."""
        cmd = ["dbt"] + args + ["--project-dir", self._project_dir, "--profiles-dir", self._profiles_dir]

        async def _exec():
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

        try:
            return await self._retry(_exec)
        except asyncio.TimeoutError:
            return {"success": False, "error": "dbt command timed out"}
        except FileNotFoundError:
            return {"success": False, "error": "dbt not found in PATH"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    # ── Public interface ────────────────────────────────────────────

    async def test(self) -> ConnectorResult:
        start = datetime.utcnow()
        action = "test"
        result = await self._run_dbt(["--version"], timeout=10)
        ms = (datetime.utcnow() - start).total_seconds() * 1000

        if result.get("success"):
            self._status = ToolStatus.CONNECTED
            self._record_audit(action, True, True, ms)
            return ConnectorResult(
                success=True,
                data={"version": result.get("stdout", "").strip()},
                tool_name=self.name, action=action, read_only=True, execution_time_ms=ms,
            )
        else:
            self._status = ToolStatus.ERROR
            self._record_audit(action, True, False, ms, result.get("error"))
            return ConnectorResult(
                success=False, error=result.get("error", "dbt not available"),
                tool_name=self.name, action=action,
            )

    async def health(self) -> ConnectorHealth:
        start = datetime.utcnow()
        result = await self._run_dbt(["debug", "--no-send-anonymous-usage-stats"], timeout=30)
        ms = (datetime.utcnow() - start).total_seconds() * 1000
        return ConnectorHealth(
            status="healthy" if result.get("success") else "error",
            latency_ms=ms,
            details={"connection": "ok" if result.get("success") else "failed"},
        )

    async def list_resources(self, resource_type: str = "models") -> ConnectorResult:
        start = datetime.utcnow()
        action = f"list_{resource_type}"
        try:
            data: List[Dict] = []
            result = await self._run_dbt(
                ["ls", "--resource-type", resource_type.rstrip("s"), "--output", "json"],
                timeout=30,
            )
            if result.get("success"):
                for line in result.get("stdout", "").strip().split("\n"):
                    line = line.strip()
                    if line:
                        try:
                            import json
                            data.append(json.loads(line))
                        except Exception:
                            data.append({"name": line, "package": "unknown"})

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
            result = await self._run_dbt(
                ["ls", "--select", resource_id, "--output", "json"], timeout=15,
            )
            data: Any = {}
            if result.get("success"):
                stdout = result.get("stdout", "").strip()
                if stdout:
                    try:
                        import json
                        data = json.loads(stdout.split("\n")[0])
                    except Exception:
                        data = {"name": resource_id}

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
            if action == "run":
                validated = DbtRunParams(**params)
                if dry_run:
                    ms = (datetime.utcnow() - start).total_seconds() * 1000
                    return ConnectorResult(
                        success=True,
                        data={"dry_run": True, "would_run": validated.select or "all models"},
                        tool_name=self.name, action=action, read_only=False, execution_time_ms=ms,
                    )
                args = ["run"]
                if validated.select:
                    args += ["--select", validated.select]
                if validated.full_refresh:
                    args.append("--full-refresh")
                result = await self._run_dbt(args, timeout=300)

            elif action == "test":
                validated = DbtTestParams(**params)
                if dry_run:
                    ms = (datetime.utcnow() - start).total_seconds() * 1000
                    return ConnectorResult(
                        success=True,
                        data={"dry_run": True, "would_test": validated.select or "all tests"},
                        tool_name=self.name, action=action, read_only=False, execution_time_ms=ms,
                    )
                args = ["test"]
                if validated.select:
                    args += ["--select", validated.select]
                result = await self._run_dbt(args, timeout=300)

            elif action == "seed":
                result = await self._run_dbt(["seed"], timeout=300)

            elif action == "generate_docs":
                result = await self._run_dbt(["docs", "generate"], timeout=120)

            else:
                ms = (datetime.utcnow() - start).total_seconds() * 1000
                self._record_audit(action, read_only, False, ms, f"Unknown action: {action}")
                return ConnectorResult(
                    success=False, error=f"Unknown action: {action}",
                    tool_name=self.name, action=action,
                )

            ms = (datetime.utcnow() - start).total_seconds() * 1000
            self._record_audit(action, read_only, result.get("success", False), ms)
            return ConnectorResult(
                success=result.get("success", False),
                data={"output": result.get("stdout", "")[-2000:]},
                error=result.get("stderr", "") if not result.get("success") else None,
                tool_name=self.name, action=action, read_only=read_only, execution_time_ms=ms,
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
            result = await self._run_dbt(
                ["run", "--select", resource_id, "--no-version-check"], timeout=120,
            )
            lines = result.get("stdout", "").split("\n")[-limit:]
            data = [{"line": i, "text": line} for i, line in enumerate(lines) if line.strip()]
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
            models_result = await self.list_resources("model")
            tests_result = await self.list_resources("test")
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            data = {
                "total_models": len(models_result.data or []),
                "total_tests": len(tests_result.data or []),
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


dbt_connector_v2 = DbtConnectorV2()
