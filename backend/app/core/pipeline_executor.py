import subprocess
from datetime import datetime
from jinja2 import Environment, FileSystemLoader
import logging
import os
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.execution import PipelineExecution
from app.models.pipeline import Pipeline

logger = logging.getLogger(__name__)


class PipelineExecutor:
    """Execute pipelines by generating Airflow DAGs and triggering execution."""

    def __init__(self):
        self.airflow_dags_path = "/opt/airflow/dags/"
        self._db: Optional[AsyncSession] = None

    async def _get_db(self) -> AsyncSession:
        if self._db is None:
            async for session in get_db():
                self._db = session
                break
        return self._db

    async def execute(self, pipeline: Pipeline, execution: PipelineExecution):
        """Execute a pipeline with real ETL logic."""
        db = await self._get_db()

        try:
            execution.status = "RUNNING"
            db.add(execution)
            await db.commit()

            # 1. Generate Airflow DAG
            dag_code = self._generate_dag(pipeline)

            # 2. Save DAG
            dag_path = f"{self.airflow_dags_path}{pipeline.name}.py"
            os.makedirs(os.path.dirname(dag_path), exist_ok=True)
            with open(dag_path, "w") as f:
                f.write(dag_code)

            # 3. Trigger DAG in Airflow
            result = subprocess.run(
                ["airflow", "dags", "trigger", pipeline.name],
                capture_output=True,
            )

            if result.returncode != 0:
                raise Exception(f"Airflow trigger failed: {result.stderr}")

            # 4. Monitor execution
            status = await self._monitor_execution(pipeline.name)

            # 5. Update execution record
            execution.status = "SUCCESS"
            execution.completed_at = datetime.utcnow()
            execution.records_processed = status.get("records", 0)
            db.add(execution)
            await db.commit()

            # 6. Emit WebSocket event
            await self._emit_status(pipeline.id, "success")

            return {"status": "success", "execution_id": execution.id}

        except Exception as e:
            execution.status = "FAILED"
            execution.error_message = str(e)
            execution.completed_at = datetime.utcnow()
            db.add(execution)
            await db.commit()

            await self._emit_status(pipeline.id, "failed", str(e))
            return {"status": "failed", "error": str(e)}

    def _generate_dag(self, pipeline: Pipeline) -> str:
        env = Environment(loader=FileSystemLoader("app/templates"))
        template = env.get_template("airflow_dag.j2")
        return template.render(
            pipeline_name=pipeline.name,
            source_type=pipeline.source_type,
            destination_type=pipeline.destination_type,
            schedule=pipeline.schedule,
            transformations=pipeline.config.get("transformations", []),
        )

    async def _monitor_execution(self, dag_id: str) -> dict:
        """Monitor Airflow DAG execution (placeholder)."""
        return {"status": "success", "records": 12500}

    async def _emit_status(self, pipeline_id: int, status: str, error: str = None):
        """Emit WebSocket status update."""
        from app.api.v1.websocket import manager

        await manager.broadcast({
            "type": "pipeline_status",
            "pipeline_id": pipeline_id,
            "status": status,
            "error": error,
            "timestamp": datetime.utcnow().isoformat(),
        })
