"""
Memory API — Endpoints for querying and managing the three-layer memory system.

Endpoints:
    GET  /stats                         — Memory statistics across all layers
    GET  /health                        — Health check for all memory backends
    GET  /conversation/{session_id}     — Get conversation history
    POST /conversation/{session_id}     — Add a conversation message
    DELETE /conversation/{session_id}   — Clear conversation history
    GET  /project/{project_id}          — Get project data by category
    POST /project/{project_id}          — Store project data
    GET  /project/{project_id}/architectures — Get project architectures
    GET  /project/{project_id}/incidents     — Find similar incidents
    POST /knowledge/search              — Semantic search across knowledge
    POST /knowledge/add                 — Add knowledge entry
    GET  /knowledge/stats               — Knowledge store statistics
    GET  /context/{session_id}          — Get full context bundle for agents
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional

from app.memory import memory_manager, KnowledgeType
from app.api.v1.deps import get_current_user

router = APIRouter()


# ── Request/Response Models ──────────────────────────────────────────

class ConversationMessage(BaseModel):
    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., min_length=1)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ProjectDataStore(BaseModel):
    category: str = Field(..., min_length=1)
    key: str = Field(..., min_length=1)
    value: Dict[str, Any] = Field(default_factory=dict)
    entry_type: str = "generic"


class KnowledgeAddRequest(BaseModel):
    knowledge_type: str = Field(..., description="documentation, code, incident, standard, architecture")
    content: str = Field(..., min_length=1)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    title: Optional[str] = None
    language: Optional[str] = None


class KnowledgeSearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    knowledge_type: Optional[str] = None
    top_k: int = Field(5, ge=1, le=20)


# ── Stats & Health ───────────────────────────────────────────────────

@router.get("/stats")
async def memory_stats(
    project_id: str = Query("default"),
    current_user=Depends(get_current_user),
):
    """Get comprehensive memory statistics across all layers."""
    return await memory_manager.get_stats(project_id)


@router.get("/health")
async def memory_health(
    current_user=Depends(get_current_user),
):
    """Health check for all memory backends."""
    return await memory_manager.health()


# ── Conversation Layer ───────────────────────────────────────────────

@router.get("/conversation/{session_id}")
async def get_conversation(
    session_id: str,
    limit: int = Query(20, ge=1, le=100),
    current_user=Depends(get_current_user),
):
    """Get conversation history for a session."""
    history = await memory_manager.get_conversation_history(session_id, limit)
    return {"session_id": session_id, "messages": history, "count": len(history)}


@router.post("/conversation/{session_id}")
async def add_conversation_message(
    session_id: str,
    message: ConversationMessage,
    current_user=Depends(get_current_user),
):
    """Add a message to the conversation history."""
    await memory_manager.add_conversation_message(
        session_id, message.role, message.content, message.metadata,
    )
    return {"status": "added", "session_id": session_id}


@router.delete("/conversation/{session_id}")
async def clear_conversation(
    session_id: str,
    current_user=Depends(get_current_user),
):
    """Clear conversation history for a session."""
    from app.memory import conversation_memory
    await conversation_memory.clear(session_id)
    return {"status": "cleared", "session_id": session_id}


# ── Project Layer ────────────────────────────────────────────────────

@router.get("/project/{project_id}")
async def get_project_data(
    project_id: str,
    category: str = Query(..., min_length=1),
    key: Optional[str] = None,
    current_user=Depends(get_current_user),
):
    """Retrieve project data by category and optional key."""
    entries = await memory_manager.get_project_data(project_id, category, key)
    return {"project_id": project_id, "category": category, "entries": entries, "count": len(entries)}


@router.post("/project/{project_id}")
async def store_project_data(
    project_id: str,
    data: ProjectDataStore,
    current_user=Depends(get_current_user),
):
    """Store data in the project memory."""
    await memory_manager.store_project_data(
        project_id, data.category, data.key, data.value, data.entry_type,
    )
    return {"status": "stored", "project_id": project_id, "key": data.key}


@router.get("/project/{project_id}/architectures")
async def get_project_architectures(
    project_id: str,
    current_user=Depends(get_current_user),
):
    """Get all architecture graphs for a project."""
    archs = await memory_manager.get_architectures(project_id)
    return {"project_id": project_id, "architectures": archs, "count": len(archs)}


@router.get("/project/{project_id}/incidents")
async def find_similar_incidents(
    project_id: str,
    query: str = Query(..., min_length=1),
    current_user=Depends(get_current_user),
):
    """Find past incidents similar to a query."""
    incidents = await memory_manager.find_similar_incidents(project_id, query)
    return {"project_id": project_id, "incidents": incidents, "count": len(incidents)}


# ── Knowledge Layer ──────────────────────────────────────────────────

@router.post("/knowledge/search")
async def search_knowledge(
    request: KnowledgeSearchRequest,
    current_user=Depends(get_current_user),
):
    """Semantic search across all knowledge collections."""
    kt = None
    if request.knowledge_type:
        try:
            kt = KnowledgeType(request.knowledge_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid knowledge_type: {request.knowledge_type}")

    results = await memory_manager.search_knowledge(request.query, kt, request.top_k)
    return {"query": request.query, "results": results, "count": len(results)}


@router.post("/knowledge/add")
async def add_knowledge(
    request: KnowledgeAddRequest,
    current_user=Depends(get_current_user),
):
    """Add an entry to the knowledge store."""
    try:
        kt = KnowledgeType(request.knowledge_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid knowledge_type: {request.knowledge_type}")

    metadata = request.metadata.copy()
    if request.title:
        metadata["title"] = request.title
    if request.language:
        metadata["language"] = request.language

    entry_id = await memory_manager.add_knowledge(kt, request.content, metadata)
    return {"status": "added", "id": entry_id, "knowledge_type": request.knowledge_type}


@router.get("/knowledge/stats")
async def knowledge_stats(
    current_user=Depends(get_current_user),
):
    """Get knowledge store statistics."""
    from app.memory import knowledge_memory
    return await knowledge_memory.get_stats()


# ── Cross-Layer Context ──────────────────────────────────────────────

@router.get("/context/{session_id}")
async def get_full_context(
    session_id: str,
    project_id: str = Query("default"),
    query: str = Query("", description="Optional search query for knowledge retrieval"),
    current_user=Depends(get_current_user),
):
    """Get a comprehensive context bundle combining all three memory layers."""
    return await memory_manager.get_full_context(session_id, project_id, query)
