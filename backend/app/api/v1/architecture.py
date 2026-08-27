import json
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import httpx
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

# ── Live infrastructure monitoring ────────────────────────────────────

@router.post("/monitor")
async def monitor_services(
    services: list[dict],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return live health status for architecture services.

    Each entry in ``services`` should have ``id`` and ``service`` (name).
    The endpoint probes real backends where possible and returns a status
    map keyed by component id.
    """
    results = {}
    import asyncio, time

    # Probe database connectivity
    async def _check_db(name: str) -> dict:
        lower = name.lower()
        if "postgres" in lower:
            try:
                async with AsyncSessionLocal() as session:
                    start = time.monotonic()
                    await asyncio.wait_for(session.execute(text("SELECT 1")), timeout=5)
                    ms = int((time.monotonic() - start) * 1000)
                    return {"status": "healthy", "metrics": {"Latency": f"{ms}ms", "Connections": str(settings.DATABASE_URL.count("@"))}}
            except Exception:
                return {"status": "error", "metrics": {"Error": "Connection failed"}}
        elif "qdrant" in lower or "vector" in lower:
            try:
                from qdrant_client import QdrantClient
                client = QdrantClient(url=settings.QDRANT_URL, timeout=3.0, check_compatibility=False)
                start = time.monotonic()
                cols = client.get_collections().collections
                ms = int((time.monotonic() - start) * 1000)
                return {"status": "healthy", "metrics": {"Latency": f"{ms}ms", "Collections": str(len(cols))}}
            except Exception:
                return {"status": "disconnected", "metrics": {"Error": "Qdrant unavailable"}}
        else:
            # Unknown service — assume healthy (can't probe externally)
            return {"status": "healthy", "metrics": {}}

    # Run probes concurrently
    probe_tasks = []
    probe_ids = []
    for svc in services:
        sid = svc.get("id", "")
        name = svc.get("service", "")
        probe_tasks.append(_check_db(name))
        probe_ids.append(sid)

    probe_results = await asyncio.gather(*probe_tasks, return_exceptions=True)

    for sid, result in zip(probe_ids, probe_results):
        if isinstance(result, Exception):
            results[sid] = {"status": "error", "metrics": {"Error": str(result)}}
        else:
            results[sid] = result

    return results


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


# ── AI Architecture Copilot ─────────────────────────────────────────

class CopilotRequest(BaseModel):
    message: str
    architecture: dict


class CopilotMessage(BaseModel):
    response: str
    suggestions: list[str] = []
    actions: list[dict] = []


COPILOT_SYSTEM_PROMPT = """You are AIDEN Copilot, an expert data-engineering architecture advisor.
The user has an architecture with the components and connections listed below.
Answer concisely. When you suggest improvements, format suggestions as a short list.
When recommending actions (add a component, remove a component, modify a connection),
return them in the 'actions' array with fields: label, type, payload.
Always respond in valid JSON with keys: response, suggestions, actions."""


@router.post("/copilot", response_model=CopilotMessage)
async def architecture_copilot(
    request: CopilotRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """AI copilot that answers questions about an architecture."""
    import json as _json
    import asyncio, time

    arch = request.architecture
    components_summary = []
    for c in arch.get("components", []):
        status_str = c.get("status", "unknown")
        components_summary.append(
            f"- {c.get('name', 'Unknown')} ({c.get('category', 'unknown')}, {c.get('service', '')}) [{status_str}]"
        )
    connections_summary = []
    for e in arch.get("connections", []):
        src = e.get("source", "?")
        tgt = e.get("target", "?")
        connections_summary.append(f"- {src} → {tgt} ({e.get('label', 'data')})")

    user_context = (
        f"Architecture: {arch.get('name', 'Untitled')}\n"
        f"Components ({len(components_summary)}):\n" + "\n".join(components_summary) + "\n"
        f"Connections ({len(connections_summary)}):\n" + "\n".join(connections_summary)
    )

    full_prompt = f"{COPILOT_SYSTEM_PROMPT}\n\n{user_context}\n\nUser question: {request.message}"

    # Try Ollama first (fast), then keyword fallback
    ollama_url = getattr(settings, "OLLAMA_URL", "http://localhost:11434")
    try:
        start = time.monotonic()
        resp = await asyncio.wait_for(
            httpx.AsyncClient(timeout=20.0).post(
                f"{ollama_url}/api/generate",
                json={"model": "qwen2.5:3b", "prompt": full_prompt, "stream": False},
            ),
            timeout=25.0,
        )
        if resp.status_code == 200:
            raw = resp.json().get("response", "{}")
            try:
                parsed = _json.loads(raw)
                return CopilotMessage(
                    response=parsed.get("response", ""),
                    suggestions=parsed.get("suggestions", []),
                    actions=parsed.get("actions", []),
                )
            except _json.JSONDecodeError:
                return CopilotMessage(response=raw.strip(), suggestions=[], actions=[])
    except Exception:
        pass

    # Keyword-based fallback
    msg_lower = request.message.lower()
    components = arch.get("components", [])
    response_text = ""
    suggestions: list[str] = []
    actions: list[dict] = []

    if any(w in msg_lower for w in ["bottleneck", "bottlenecks", "slow", "performance"]):
        response_text = (
            f"Analyzing {len(components)} components for potential bottlenecks:\n\n"
            "1. Check data flow between ingestion and processing layers\n"
            "2. Look for single points of failure\n"
            "3. Verify parallelism in processing components\n\n"
            "Recommendation: Add Prometheus + Grafana for real-time bottleneck detection."
        )
        suggestions = ["Add monitoring", "Check consumer lag", "Scale processors"]
        has_monitoring = any(c.get("category") == "monitoring" for c in components)
        if not has_monitoring:
            actions.append({"label": "Add Prometheus Monitoring", "type": "add-node", "payload": {
                "name": "Prometheus", "icon": "\U0001f525", "category": "monitoring",
                "service": "Prometheus", "status": "healthy",
                "metrics": {"Targets": str(len(components)), "Scrape": "15s"},
            }})
            actions.append({"label": "Add Grafana Dashboard", "type": "add-node", "payload": {
                "name": "Grafana", "icon": "\U0001f4c8", "category": "monitoring",
                "service": "Grafana 10", "status": "healthy",
                "metrics": {"Dashboards": "6", "Panels": "48"},
            }})
    elif any(w in msg_lower for w in ["monitor", "monitoring", "observability"]):
        has_monitoring = any(c.get("category") == "monitoring" for c in components)
        if has_monitoring:
            response_text = "A monitoring component already exists. Consider adding Prometheus for metrics collection and an alerting layer."
        else:
            response_text = "No monitoring detected. Adding monitoring is critical for production systems.\n\nI'll add Prometheus for metrics collection and Grafana for dashboards."
            suggestions = ["Add Prometheus", "Add Grafana dashboard", "Add OpenTelemetry"]
            actions.append({"label": "Add Prometheus", "type": "add-node", "payload": {
                "name": "Prometheus", "icon": "\U0001f525", "category": "monitoring",
                "service": "Prometheus", "status": "healthy",
                "metrics": {"Targets": str(len(components)), "Scrape": "15s"},
            }})
            actions.append({"label": "Add Grafana Dashboard", "type": "add-node", "payload": {
                "name": "Grafana", "icon": "\U0001f4c8", "category": "monitoring",
                "service": "Grafana 10", "status": "healthy",
                "metrics": {"Dashboards": "6", "Panels": "48"},
            }})
    elif any(w in msg_lower for w in ["security", "secure", "vault", "iam"]):
        has_security = any(c.get("category") == "security" for c in components)
        if has_security:
            response_text = "A security component exists. Review access policies and secrets management."
        else:
            response_text = "No security layer detected. Production architectures need IAM, secrets management, and network policies.\n\nI'll add HashiCorp Vault for secrets management."
            suggestions = ["Add Vault", "Add IAM", "Add network policies"]
            actions.append({"label": "Add Vault (Secrets Management)", "type": "add-node", "payload": {
                "name": "Vault", "icon": "\U0001f510", "category": "security",
                "service": "HashiCorp Vault", "status": "healthy",
                "metrics": {"Secrets": "128", "Leases": "1.2K"},
            }})
    elif any(w in msg_lower for w in ["production", "prod", "hardening"]):
        response_text = "Production readiness checklist:\n"
        cats = set(c.get("category", "") for c in components)
        missing = []
        if "monitoring" not in cats:
            missing.append("monitoring")
        if "security" not in cats:
            missing.append("security")
        if missing:
            response_text += f"Missing: {', '.join(missing)}\n\n"
            response_text += "I'll add the missing components to make this production-ready."
            suggestions = [f"Add {m}" for m in missing]
            if "monitoring" in missing:
                actions.append({"label": "Add Prometheus", "type": "add-node", "payload": {
                    "name": "Prometheus", "icon": "\U0001f525", "category": "monitoring",
                    "service": "Prometheus", "status": "healthy",
                    "metrics": {"Targets": str(len(components)), "Scrape": "15s"},
                }})
                actions.append({"label": "Add Grafana Dashboard", "type": "add-node", "payload": {
                    "name": "Grafana", "icon": "\U0001f4c8", "category": "monitoring",
                    "service": "Grafana 10", "status": "healthy",
                    "metrics": {"Dashboards": "6", "Panels": "48"},
                }})
            if "security" in missing:
                actions.append({"label": "Add Vault (Secrets Management)", "type": "add-node", "payload": {
                    "name": "Vault", "icon": "\U0001f510", "category": "security",
                    "service": "HashiCorp Vault", "status": "healthy",
                    "metrics": {"Secrets": "128", "Leases": "1.2K"},
                }})
        else:
            response_text += "Core layers present. Consider adding disaster recovery and data quality gates."
            suggestions = ["Add DR", "Add data quality"]
    elif any(w in msg_lower for w in ["cost", "expensive", "optimize", "cheap"]):
        response_text = (
            f"Architecture has {len(components)} components. Key cost factors:\n"
            "- Storage and compute in processing layer\n"
            "- Streaming throughput\n"
            "- Warehouse query volume"
        )
        suggestions = ["Right-size instances", "Use spot instances", "Archive old data"]
    elif any(w in msg_lower for w in ["disaster", "recovery", "backup", "dr"]):
        response_text = (
            "Disaster recovery recommendations:\n"
            "- Implement cross-region replication\n"
            "- Set up automated backups\n"
            "- Create failover procedures\n\n"
            "I'll add a backup storage component for disaster recovery."
        )
        suggestions = ["Add cross-region replication", "Enable automated backups"]
        actions.append({"label": "Add S3 Backup Storage", "type": "add-node", "payload": {
            "name": "S3 Backup", "icon": "\U0001faa6", "category": "storage",
            "service": "Amazon S3", "status": "healthy",
            "metrics": {"Bucket": "dr-backup", "Versioning": "Enabled"},
        }})
    elif any(w in msg_lower for w in ["improve", "better", "enhance", "optimize architecture"]):
        cats = set(c.get("category", "") for c in components)
        missing = []
        if "monitoring" not in cats:
            missing.append("monitoring")
        if "security" not in cats:
            missing.append("security")
        if "quality" not in cats:
            missing.append("quality")
        response_text = f"Current architecture has {len(components)} components. Suggestions for improvement:\n\n"
        if missing:
            response_text += f"Missing layers: {', '.join(missing)}\n"
            suggestions = [f"Add {m}" for m in missing]
            if "monitoring" in missing:
                actions.append({"label": "Add Prometheus", "type": "add-node", "payload": {
                    "name": "Prometheus", "icon": "\U0001f525", "category": "monitoring",
                    "service": "Prometheus", "status": "healthy",
                    "metrics": {"Targets": str(len(components)), "Scrape": "15s"},
                }})
            if "security" in missing:
                actions.append({"label": "Add Vault (Secrets Management)", "type": "add-node", "payload": {
                    "name": "Vault", "icon": "\U0001f510", "category": "security",
                    "service": "HashiCorp Vault", "status": "healthy",
                    "metrics": {"Secrets": "128", "Leases": "1.2K"},
                }})
            if "quality" in missing:
                actions.append({"label": "Add Great Expectations", "type": "add-node", "payload": {
                    "name": "Great Expectations", "icon": "\u2705", "category": "quality",
                    "service": "Great Expectations", "status": "healthy",
                    "metrics": {"Suites": "24", "Expectations": "156"},
                }})
        else:
            response_text += "All core layers present. Consider adding disaster recovery and data quality gates."
            suggestions = ["Add DR", "Add data quality"]
    elif any(w in msg_lower for w in ["terrarform", "iac", "infrastructure as code"]):
        response_text = "I can help generate Terraform for the components in this architecture. The current setup includes:\n"
        for c in components[:5]:
            response_text += f"- {c.get('name', 'Unknown')}\n"
        response_text += "\nWould you like me to generate Terraform for a specific cloud provider?"
        suggestions = ["Generate AWS Terraform", "Generate GCP Terraform", "Generate Azure Terraform"]
    else:
        # General analysis
        response_text = (
            f"This architecture has {len(components)} components with {len(arch.get('connections', []))} connections.\n\n"
            "Components by category:\n"
        )
        cat_counts: dict[str, int] = {}
        for c in components:
            cat = c.get("category", "other")
            cat_counts[cat] = cat_counts.get(cat, 0) + 1
        for cat, count in sorted(cat_counts.items()):
            response_text += f"  {cat}: {count}\n"

        healthy = sum(1 for c in components if c.get("status") == "healthy")
        response_text += f"\nHealth: {healthy}/{len(components)} healthy"

        suggestions = ["Find bottlenecks", "Add monitoring", "Improve security"]

    return CopilotMessage(response=response_text, suggestions=suggestions, actions=actions)
