"""
Spark Service — Apache Spark job submission and management.

Submits Spark jobs via the Spark REST API or spark-submit,
monitors job status, and retrieves logs.
"""

import logging
from typing import Dict, Any, Optional
import subprocess
import json

logger = logging.getLogger(__name__)


class SparkService:
    """Submit and manage Spark jobs."""

    def __init__(self, master_url: str = "local[*]", spark_home: Optional[str] = None):
        self.master_url = master_url
        self.spark_home = spark_home or ""

    async def submit_job(self, job_path: str, job_args: Optional[Dict] = None) -> Dict[str, Any]:
        """Submit a Spark job via spark-submit."""
        cmd = [f"{self.spark_home}/bin/spark-submit" if self.spark_home else "spark-submit"]
        cmd.extend(["--master", self.master_url])
        cmd.append(job_path)

        if job_args:
            cmd.append("--args")
            cmd.append(json.dumps(job_args))

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=600,
            )
            return {
                "success": result.returncode == 0,
                "stdout": result.stdout[-2000:],
                "stderr": result.stderr[-2000:],
                "return_code": result.returncode,
            }
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "Spark job timed out"}
        except FileNotFoundError:
            return {"success": False, "error": "spark-submit not found"}
        except Exception as e:
            return {"success": False, "error": str(e)}


spark_service = SparkService()
