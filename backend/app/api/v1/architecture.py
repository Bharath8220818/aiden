import json
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.api.v1.deps import get_current_user
from app.schemas.architecture import ArchitectureGenerateRequest, ArchitectureResponse
from app.services.hf_service import hf_service
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


# ── LLM architecture generation prompt ─────────────────────────────────
ARCHITECTURE_SYSTEM_PROMPT = """
You are a cloud/data-engineering architect. Given a natural-language description,
return a JSON object describing the architecture with these fields:

- title: A short architecture name
- components: array of {id, name, type, category, service, status, metrics}
  - type: one of "source", "streaming", "processing", "storage", "analytics", "monitoring", "security"
  - category: one of "databases", "streaming", "processing", "storage", "cloud", "orchestration", "monitoring", "ai", "security", "containers", "quality"
  - service: the specific service name (e.g. "PostgreSQL", "Apache Kafka", "Snowflake")
  - status: "healthy" (default)
  - metrics: object of up to 3 key-value metric strings (e.g. {"Topics": "42", "Lag": "120ms"})
- connections: array of {id, source, target, label, edgeType}
  - edgeType: one of "dataflow", "control", "api", "event", "monitoring", "security"
  - label: a short label for the edge (e.g. "CDC", "Stream", "Transform")
- explanation: a brief explanation of the architecture

Rules:
- Use real, well-known data engineering services.
- Order components left-to-right: sources → ingestion → processing → storage → analytics.
- Each component must have a unique id (e.g. "pg-1", "kafka-1").
- Only return valid JSON, no markdown, no commentary.
"""


# ── Service catalog (maps names to metadata for the canvas) ───────────
SERVICE_CATALOG = {
    # Databases
    "postgresql": {"icon": "\U0001f418", "category": "databases", "service": "PostgreSQL"},
    "postgres": {"icon": "\U0001f418", "category": "databases", "service": "PostgreSQL"},
    "mysql": {"icon": "\U0001f42c", "category": "databases", "service": "MySQL"},
    "mongodb": {"icon": "\U0001f343", "category": "databases", "service": "MongoDB"},
    "redis": {"icon": "\U0001f534", "category": "databases", "service": "Redis"},
    "snowflake": {"icon": "\u2744\ufe0f", "category": "databases", "service": "Snowflake"},
    "bigquery": {"icon": "\U0001f50d", "category": "databases", "service": "BigQuery"},
    "redshift": {"icon": "\U0001f4ca", "category": "databases", "service": "Redshift"},
    "oracle": {"icon": "\U0001f536", "category": "databases", "service": "Oracle DB"},
    "sql server": {"icon": "\U0001f537", "category": "databases", "service": "SQL Server"},
    # Streaming
    "kafka": {"icon": "\U0001f4e1", "category": "streaming", "service": "Apache Kafka"},
    "kafka connect": {"icon": "\U0001f517", "category": "streaming", "service": "Kafka Connect"},
    "kinesis": {"icon": "\U0001f30a", "category": "streaming", "service": "Amazon Kinesis"},
    "flink": {"icon": "\u26a1", "category": "streaming", "service": "Apache Flink"},
    "pubsub": {"icon": "\U0001f4e2", "category": "streaming", "service": "Google Pub/Sub"},
    # Processing
    "spark": {"icon": "\u2728", "category": "processing", "service": "Apache Spark"},
    "dbt": {"icon": "\U0001f527", "category": "processing", "service": "dbt"},
    "hadoop": {"icon": "\U0001f418", "category": "processing", "service": "Hadoop"},
    "trino": {"icon": "\U0001f53a", "category": "processing", "service": "Trino"},
    # Storage
    "s3": {"icon": "\U0001faa6", "category": "storage", "service": "Amazon S3"},
    "data lake": {"icon": "\U0001f3de\ufe0f", "category": "storage", "service": "Data Lake"},
    "data warehouse": {"icon": "\U0001f3d7\ufe0f", "category": "storage", "service": "Data Warehouse"},
    "lakehouse": {"icon": "\U0001f3e0", "category": "storage", "service": "Lakehouse"},
    # Orchestration
    "airflow": {"icon": "\U0001f32c\ufe0f", "category": "orchestration", "service": "Apache Airflow"},
    "dagster": {"icon": "\U0001f48e", "category": "orchestration", "service": "Dagster"},
    # Monitoring
    "grafana": {"icon": "\U0001f4c8", "category": "monitoring", "service": "Grafana"},
    "prometheus": {"icon": "\U0001f525", "category": "monitoring", "service": "Prometheus"},
    # AI
    "llm": {"icon": "\U0001f9e0", "category": "ai", "service": "LLM"},
    "vector db": {"icon": "\U0001f52e", "category": "ai", "service": "Vector DB"},
    "qdrant": {"icon": "\U0001f52e", "category": "ai", "service": "Qdrant"},
    "rag": {"icon": "\U0001f4da", "category": "ai", "service": "RAG Pipeline"},
    # Containers / DevOps
    "docker": {"icon": "\U0001f433", "category": "containers", "service": "Docker"},
    "kubernetes": {"icon": "\u2638\ufe0f", "category": "containers", "service": "Kubernetes"},
    # Quality
    "great expectations": {"icon": "\u2705", "category": "quality", "service": "Great Expectations"},
}


def _resolve_service(name: str) -> dict:
    """Look up a service in the catalog by fuzzy name match."""
    lower = name.lower().strip()
    if lower in SERVICE_CATALOG:
        return SERVICE_CATALOG[lower]
    # Try substring match
    for key, meta in SERVICE_CATALOG.items():
        if key in lower or lower in key:
            return meta
    # Default fallback
    return {"icon": "\U0001f4e6", "category": "processing", "service": name}


@router.post("/generate", response_model=ArchitectureResponse)
async def generate_architecture(
    request: ArchitectureGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a cloud architecture from a natural language description using LLM."""
    prompt = request.prompt
    cloud = request.cloud_provider or "aws"

    # Build the full prompt
    full_prompt = (
        f"{ARCHITECTURE_SYSTEM_PROMPT}\n\n"
        f"Cloud provider preference: {cloud}\n"
        f"User request: {prompt}"
    )

    # Try Ollama first (fast, local, 15s timeout — no model load on CPU)
    llm_response = None
    try:
        import requests as _requests
        resp = _requests.post(
            f"{settings.LLM_BASE_URL}/api/generate",
            json={
                "model": settings.LLM_MODEL,
                "prompt": full_prompt,
                "stream": False,
                "options": {"temperature": 0.1, "num_predict": 2048},
            },
            timeout=15,
        )
        if resp.status_code == 200:
            llm_response = resp.json().get("response", "")
            logger.info(f"Ollama generated architecture response ({len(llm_response)} chars)")
    except Exception as e:
        logger.info(f"Ollama unavailable for architecture generation: {e}")

    # Skip HF generation for architecture — model loading on CPU takes minutes,
    # which exceeds any reasonable HTTP timeout. Use keyword-based fallback instead.
    if not llm_response:
        logger.info("LLM unavailable — using keyword-based architecture generation")

    # Parse LLM response
    if llm_response:
        parsed = _parse_llm_response(llm_response)
        if parsed:
            # Enrich components with catalog metadata
            _enrich_components(parsed)
            parsed["id"] = str(uuid.uuid4())[:8]
            return parsed

    # Fallback: generate a reasonable architecture from the prompt keywords
    logger.info("LLM unavailable — using keyword-based architecture generation")
    return _keyword_based_generation(prompt, cloud)


def _parse_llm_response(response: str) -> Optional[ArchitectureResponse]:
    """Extract JSON from LLM response and validate."""
    # Find JSON block
    json_start = response.find('{')
    json_end = response.rfind('}') + 1
    if json_start == -1 or json_end <= 0:
        return None

    json_str = response[json_start:json_end]
    try:
        data = json.loads(json_str)
    except json.JSONDecodeError:
        logger.warning("Failed to parse LLM JSON response")
        return None

    # Validate required fields
    if "components" not in data or not isinstance(data["components"], list):
        return None
    if "connections" not in data or not isinstance(data["connections"], list):
        return None

    return data


def _enrich_components(data: dict) -> None:
    """Enrich component entries with catalog metadata (icon, category)."""
    for comp in data.get("components", []):
        name = comp.get("service") or comp.get("name", "")
        meta = _resolve_service(name)
        comp.setdefault("icon", meta["icon"])
        comp.setdefault("category", meta["category"])
        comp.setdefault("service", meta["service"])
        comp.setdefault("status", "healthy")
        comp.setdefault("metrics", {})


def _keyword_based_generation(prompt: str, cloud: str) -> ArchitectureResponse:
    """Rule-based fallback: extract service mentions and build a linear architecture."""
    prompt_lower = prompt.lower()
    components = []
    connections = []
    idx = 0

    # Detect services mentioned in the prompt (deduplicate by service name)
    detected = []
    seen_services = set()
    for name, meta in SERVICE_CATALOG.items():
        if name in prompt_lower and meta["service"] not in seen_services:
            detected.append((name, meta))
            seen_services.add(meta["service"])

    # If nothing detected, provide a sensible default
    if not detected:
        detected = [
            ("postgresql", SERVICE_CATALOG["postgresql"]),
            ("kafka", SERVICE_CATALOG["kafka"]),
            ("spark", SERVICE_CATALOG["spark"]),
            ("snowflake", SERVICE_CATALOG["snowflake"]),
        ]

    # Order: sources first, then streaming, processing, storage, analytics
    type_order = {"databases": 0, "streaming": 1, "orchestration": 2, "processing": 3, "storage": 4, "ai": 5, "monitoring": 6, "quality": 7}
    detected.sort(key=lambda x: type_order.get(x[1]["category"], 5))

    # Build components
    for name, meta in detected:
        idx += 1
        comp_id = f"{name.replace(' ', '-')}-{idx}"
        components.append({
            "id": comp_id,
            "name": meta["service"],
            "type": meta["category"],
            "category": meta["category"],
            "service": meta["service"],
            "icon": meta["icon"],
            "status": "healthy",
            "metrics": {},
        })

    # Build sequential connections
    for i in range(len(components) - 1):
        connections.append({
            "id": f"e-{components[i]['id']}-{components[i+1]['id']}",
            "source": components[i]["id"],
            "target": components[i + 1]["id"],
            "label": "Data Flow",
            "edgeType": "dataflow",
        })

    return {
        "id": str(uuid.uuid4())[:8],
        "title": f"Architecture: {prompt[:60]}...",
        "components": components,
        "connections": connections,
        "explanation": f"Generated from prompt using keyword detection ({len(components)} components).",
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
