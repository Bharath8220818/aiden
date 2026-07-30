"""
dbt Service — dbt Core runner for executing data transformations.

Manages dbt project directories, runs dbt models, tests, and
documentation generation. Supports dbt-postgres, dbt-snowflake,
dbt-bigquery, and dbt-redshift adapters.
"""

import logging
import subprocess
from typing import Dict, Any, List, Optional
from pathlib import Path

logger = logging.getLogger(__name__)


class DbtService:
    """Run dbt Core commands for pipeline transformations."""

    def __init__(self, project_dir: str = "dbt_project"):
        self.project_dir = Path(project_dir)

    async def run_models(self, select: Optional[str] = None) -> Dict[str, Any]:
        """Run dbt models, optionally filtered by --select."""
        cmd = ["dbt", "run"]
        if select:
            cmd.extend(["--select", select])
        return await self._run_dbt(cmd)

    async def run_tests(self, select: Optional[str] = None) -> Dict[str, Any]:
        """Run dbt tests."""
        cmd = ["dbt", "test"]
        if select:
            cmd.extend(["--select", select])
        return await self._run_dbt(cmd)

    async def generate_docs(self) -> Dict[str, Any]:
        """Generate dbt docs."""
        return await self._run_dbt(["dbt", "docs", "generate"])

    async def _run_dbt(self, cmd: List[str]) -> Dict[str, Any]:
        """Execute a dbt command."""
        try:
            result = subprocess.run(
                cmd,
                cwd=self.project_dir,
                capture_output=True,
                text=True,
                timeout=300,
            )
            return {
                "success": result.returncode == 0,
                "stdout": result.stdout[-2000:],
                "stderr": result.stderr[-2000:],
                "return_code": result.returncode,
            }
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "dbt command timed out"}
        except FileNotFoundError:
            return {"success": False, "error": "dbt not found — install with: pip install dbt-postgres"}
        except Exception as e:
            return {"success": False, "error": str(e)}


dbt_service = DbtService()
