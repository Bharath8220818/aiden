"""Chunk metadata (spec §6) — every vector carries filterable context.

The payload is what makes RAG *project-scoped*: retrieval filters on
workspace/project/environment/source_type instead of searching the whole
store. `build_payload` is the single constructor used by every writer
(documents, incidents, fixes) so filter keys stay consistent.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

REQUIRED_FILTER_KEYS = ("workspace_id", "project_id", "source_type", "environment")


def build_payload(
    *,
    project_id: str | None,
    source_type: str,
    source_id: str | None = None,
    document_id: str | None = None,
    chunk_id: str | None = None,
    environment: str | None = None,
    workspace_id: str | None = None,
    pipeline_id: str | None = None,
    agent: str | None = None,
    tags: list[str] | None = None,
    title: str = "",
    text: str = "",
    section: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """One metadata shape for every embedded chunk (spec §6 example)."""
    payload: dict[str, Any] = {
        "workspace_id": workspace_id or "default",
        "project_id": project_id or "global",
        "source_type": source_type,
        "source_id": source_id,
        "document_id": document_id,
        "chunk_id": chunk_id,
        "environment": environment or "development",
        "pipeline_id": pipeline_id,
        "agent": agent,
        "created_at": datetime.now(UTC).isoformat(),
        "tags": tags or [],
        "title": title,
        "section": section,
        "text": text,
    }
    if extra:
        payload.update({k: v for k, v in extra.items() if v is not None})
    return {k: v for k, v in payload.items() if v is not None}
