from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models.user import User
from app.api.v1.deps import get_current_user

router = APIRouter()

MOCK_TEMPLATES = [
    {"id": 1, "name": "Daily Sales ETL", "description": "Extract sales data from PostgreSQL, transform, and load into Snowflake daily.", "source": "PostgreSQL", "destination": "Snowflake", "schedule": "0 6 * * *", "usage_count": 128, "difficulty": "Beginner"},
    {"id": 2, "name": "Customer 360 Pipeline", "description": "Build a unified customer view from MySQL, CRM, and support data.", "source": "MySQL", "destination": "BigQuery", "schedule": "0 3 * * *", "usage_count": 94, "difficulty": "Intermediate"},
    {"id": 3, "name": "Real-Time Fraud Detection", "description": "Process streaming transactions from Kafka for fraud detection.", "source": "Kafka", "destination": "Redis", "schedule": "continuous", "usage_count": 67, "difficulty": "Advanced"},
    {"id": 4, "name": "IoT Data Lake", "description": "Ingest IoT sensor data from MQTT into S3 data lake with PySpark processing.", "source": "MQTT", "destination": "S3", "schedule": "0 */2 * * *", "usage_count": 52, "difficulty": "Advanced"},
]

@router.get("/")
async def list_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all pipeline templates."""
    return MOCK_TEMPLATES

@router.get("/{template_id}")
async def get_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single template by ID."""
    for t in MOCK_TEMPLATES:
        if t["id"] == template_id:
            return t
    raise HTTPException(status_code=404, detail="Template not found")

@router.post("/{template_id}/clone")
async def clone_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Clone a template to create a new pipeline."""
    for t in MOCK_TEMPLATES:
        if t["id"] == template_id:
            return {
                "message": f"Template '{t['name']}' cloned successfully",
                "pipeline_id": 0,
                "name": t["name"],
                "source": t["source"],
                "destination": t["destination"],
            }
    raise HTTPException(status_code=404, detail="Template not found")
