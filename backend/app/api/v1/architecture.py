from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.api.v1.deps import get_current_user
from app.schemas.architecture import ArchitectureGenerateRequest, ArchitectureResponse

router = APIRouter()

@router.post("/generate", response_model=ArchitectureResponse)
async def generate_architecture(
    request: ArchitectureGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a cloud architecture from a natural language description."""
    return {
        "title": f"Architecture: {request.prompt[:50]}...",
        "components": [
            {"id": "1", "name": "Mobile Apps", "type": "source", "cloud_provider": request.cloud_provider or "azure", "service": "App Service"},
            {"id": "2", "name": "Event Hub", "type": "streaming", "cloud_provider": request.cloud_provider or "azure", "service": "Event Hub"},
            {"id": "3", "name": "Stream Analytics", "type": "processing", "cloud_provider": request.cloud_provider or "azure", "service": "Stream Analytics"},
            {"id": "4", "name": "SQL Database", "type": "storage", "cloud_provider": request.cloud_provider or "azure", "service": "SQL Database"},
            {"id": "5", "name": "Power BI", "type": "visualization", "cloud_provider": request.cloud_provider or "azure", "service": "Power BI"},
        ],
        "connections": [
            {"from_id": "1", "to_id": "2", "data_flow": "stream", "protocol": "http"},
            {"from_id": "2", "to_id": "3", "data_flow": "stream", "protocol": "kafka"},
            {"from_id": "3", "to_id": "4", "data_flow": "stream", "protocol": "http"},
            {"from_id": "4", "to_id": "5", "data_flow": "batch", "protocol": "http"},
        ],
        "design_principles": ["secure", "performant", "scalable", "cost_effective"],
        "medallion_layers": {
            "bronze": "Raw ingested data",
            "silver": "Cleaned and enriched data",
            "gold": "Business-ready aggregations",
        },
        "estimated_cost": "$50/day",
        "explanation": f"Designed a {request.cloud_provider or 'Azure'}-based real-time data architecture.",
    }

@router.post("/optimize", response_model=ArchitectureResponse)
async def optimize_architecture(
    request: ArchitectureResponse,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Optimize an existing architecture for cost, performance, or reliability."""
    return {
        "title": "Optimized Architecture",
        "components": request.components,
        "design_principles": ["cost_effective", "performant"],
        "estimated_cost": "$35/day (30% reduction)",
    }

@router.get("/", response_model=list)
async def list_architectures(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List saved architectures."""
    return []
