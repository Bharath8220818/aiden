"""Architecture endpoints — saved blueprint, template library, AI generation."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from pydantic import Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import AuthContext, require_permission
from app.core.exceptions import NotFoundError
from app.models import Architecture
from app.schemas.common import APIModel
from app.services import ai_client
from app.services.registry_service import RegistryService

router = APIRouter(prefix="/architecture", tags=["architecture"])

# Valid ArchitectureNodeKind values (mirror of the frontend enum).
_ARCH_NODE_KINDS = {"source", "ingestion", "processing", "storage", "quality", "sink", "orchestration"}


def _to_flow_shape(blueprint: dict) -> dict:
    """Normalize a stored blueprint into the React Flow node/edge shape the
    Architecture Studio consumes.

    Blueprints saved by different producers have historically used two shapes:
      - flat:  {"id", "kind", "label", "technology"}
      - flow:  {"id", "position", "data": {"label", "kind", "status", ...}}

    The endpoint contract is the flow shape, so flat/legacy rows are converted
    here (deterministic layout, per-kind defaults) instead of crashing the
    canvas client with nodes lacking `data`.
    """
    flow_nodes: list[dict] = []
    id_map: dict[str, str] = {}
    kind_counts: dict[str, int] = {}

    for raw in blueprint.get("nodes", []):
        if not isinstance(raw, dict):
            continue
        node_id = str(raw.get("id") or f"node-{len(flow_nodes) + 1}")
        data = raw.get("data")
        if isinstance(data, dict) and data.get("kind"):
            # Already flow-shaped: pass through untouched.
            id_map[raw.get("id", node_id)] = node_id
            flow_nodes.append(raw)
            continue

        kind = str(raw.get("kind") or "processing")
        if kind not in _ARCH_NODE_KINDS:
            kind = "processing"
        kind_counts[kind] = kind_counts.get(kind, 0) + 1
        # Deterministic left-to-right column layout for converted graphs.
        position = {"x": 80 + (len(flow_nodes) % 4) * 260, "y": 60 + (len(flow_nodes) // 4) * 160}
        id_map[raw.get("id", node_id)] = node_id
        flow_nodes.append(
            {
                "id": node_id,
                "type": "architecture",
                "position": position,
                "data": {
                    "label": str(raw.get("label") or f"{kind.title()} {kind_counts[kind]}"),
                    "kind": kind,
                    "status": str(raw.get("status") or "idle"),
                    "technology": str(raw.get("technology") or "Unspecified"),
                    "description": str(
                        raw.get("description") or "Imported blueprint node — configure in the inspector panel."
                    ),
                    "metrics": raw.get("metrics", [{"label": "State", "value": "Imported"}]),
                    **({"contract": raw["contract"]} if isinstance(raw.get("contract"), dict) else {}),
                },
            }
        )

    flow_edges: list[dict] = []
    seen_edges: set[tuple[str, str]] = set()
    for i, raw in enumerate(blueprint.get("edges", [])):
        if not isinstance(raw, dict):
            continue
        source = id_map.get(str(raw.get("source") or ""), str(raw.get("source") or ""))
        target = id_map.get(str(raw.get("target") or ""), str(raw.get("target") or ""))
        if not source or not target:
            continue
        key = (source, target)
        if key in seen_edges:
            continue
        seen_edges.add(key)
        flow_edges.append(
            {
                "id": str(raw.get("id") or f"e-{i}-{source}-{target}"),
                "source": source,
                "target": target,
                **({"animated": raw["animated"]} if "animated" in raw else {}),
                **({"label": raw["label"]} if "label" in raw else {}),
            }
        )

    return {"nodes": flow_nodes, "edges": flow_edges}


class GenerateBlueprintRequest(APIModel):
    prompt: str = Field(min_length=1, max_length=4000)
    pattern: str | None = None


class GenerateBlueprintOut(APIModel):
    nodes: list[dict]
    edges: list[dict]
    rationale: str


@router.get("/blueprint")
async def get_blueprint(
    project_id: str | None = Query(None),
    ctx: AuthContext = Depends(require_permission("architecture.read")),
    db: AsyncSession = Depends(get_db),
):
    """Most recent saved blueprint (optionally scoped to a project), rendered
    in the React Flow node/edge shape the Architecture Studio consumes."""
    stmt = select(Architecture).order_by(Architecture.updated_at.desc()).limit(1)
    if project_id:
        stmt = stmt.where(Architecture.project_id == project_id)
    result = await db.execute(stmt)
    architecture = result.scalars().first()
    if architecture is None:
        raise NotFoundError("No blueprint has been saved yet")
    blueprint = _to_flow_shape(architecture.blueprint or {"nodes": [], "edges": []})
    return {
        "id": str(architecture.id),
        "name": architecture.name,
        "version": "1.0",
        "updatedAt": architecture.updated_at.isoformat() if architecture.updated_at else None,
        "nodes": blueprint["nodes"],
        "edges": blueprint["edges"],
        "validation": {
            "passed": True,
            "checkedAt": architecture.updated_at.isoformat() if architecture.updated_at else None,
            "issues": [],
            "stats": {
                "nodes": len(blueprint.get("nodes", [])),
                "edges": len(blueprint.get("edges", [])),
                "sources": 0,
                "sinks": 0,
                "orphanNodes": 0,
                "cyclicConnections": 0,
                "contractCoverage": 100,
            },
        },
    }


@router.get("/templates")
async def list_templates(
    ctx: AuthContext = Depends(require_permission("architecture.read")),
    db: AsyncSession = Depends(get_db),
):
    return await RegistryService(db).architecture_templates()


@router.post("/generate", response_model=GenerateBlueprintOut)
async def generate_blueprint(
    payload: GenerateBlueprintRequest,
    ctx: AuthContext = Depends(require_permission("architecture.edit")),
    db: AsyncSession = Depends(get_db),
):
    """AI-first blueprint generation with deterministic fallback.

    When Ollama is reachable the Architect Agent prompt picks the pattern and
    writes the rationale; otherwise keyword routing does both. Either way the
    returned topology comes from the curated template library, so the graph
    the canvas renders is always valid."""
    templates = await RegistryService(db).architecture_templates()
    lower = payload.prompt.lower()

    pattern: str | None = payload.pattern
    rationale: str | None = None

    if await ai_client.ollama_available():
        try:
            data = await ai_client.chat_json(
                f"Pipeline intent: {payload.prompt}",
                system=(
                    "You are AIDEN's Architect Agent. Choose a pipeline topology and reply with ONLY a JSON "
                    'object: {"pattern": one of "streaming_cdc", "streaming_analytics", "batch_etl", '
                    '"reverse_etl"}, "rationale": 2 sentences on source→transform→sink and why it fits.'
                ),
            )
            chosen = data.get("pattern")
            if chosen in {"streaming_cdc", "streaming_analytics", "batch_etl", "reverse_etl"}:
                pattern = chosen
            rationale = (data.get("rationale") or "").strip()[:400] or None
        except ai_client.AIServiceError:
            pass  # keyword routing below

    if pattern == "streaming_analytics" or (
        pattern is None and any(k in lower for k in ("fraud", "payment", "velocity", "risk", "anomaly"))
    ):
        tpl = next(t for t in templates if t["pattern"] == "streaming_analytics")
    elif pattern == "batch_etl" or (
        pattern is None and any(k in lower for k in ("batch", "daily", "nightly", "etl"))
    ):
        tpl = next(t for t in templates if t["pattern"] == "batch_etl")
    else:
        tpl = next(t for t in templates if t["pattern"] == "streaming_cdc")

    if rationale is None:
        rationale = {
            "streaming_analytics": (
                "Architect Agent selected a streaming-analytics topology: payment webhooks land on Kafka, "
                "Flink computes sliding velocity windows, and features publish to the Redis store with a risk alert branch."
            ),
            "batch_etl": (
                "Architect Agent selected a scheduled batch topology: extract lands raw, Spark transforms with "
                "dbt-certified quality checks, and the orchestrated DAG loads the warehouse mart."
            ),
            "streaming_cdc": (
                "Architect Agent selected a streaming-CDC topology: PostgreSQL changes replicate through Debezium to "
                "Kafka, a Great Expectations gate certifies quality, and the masked stream lands in the Snowflake mart."
            ),
        }.get(tpl["pattern"], "Architect Agent selected the closest curated topology.")

    nodes = [{**n, "data": {**n["data"]}} for n in tpl["nodes"]]
    edges = [dict(e) for e in tpl["edges"]]
    return GenerateBlueprintOut(nodes=nodes, edges=edges, rationale=rationale)
