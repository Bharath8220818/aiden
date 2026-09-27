"""ML record format (Phase 2) — every sample is:

    {
      "agent": "requirement_analysis",        # backend agent id (traceability)
      "instruction": "...",
      "input": "...",
      "expected_output": {...},               # renamed from backend 'output'
      "metadata": {...}                       # provenance/annotation info
    }

plus agent-specific fields (image for A2; failure/logs/root_cause/patch/
test_result for A10). Conversion from the backend dataset format lives here
so the two schemas can never silently drift.
"""

from __future__ import annotations

import json
from typing import Any

# backend agent id → dataset directory (roadmap Phase 2 layout)
AGENT_DIRS: dict[str, str] = {
    "requirement_analysis": "requirement",
    "vision_requirement": "vision",
    "audio_requirement": "audio",
    "architecture": "architecture",
    "pipeline_planning": "pipeline",
    "sql_data": "sql",
    "pipeline_code": "code",
    "validation": "validation",
    "monitoring_rca": "rca",
    "self_healing": "self_healing",
    "documentation_knowledge": "documentation",
}

# per-agent extra fields (mirrors backend schema REQUIRED_AGENT_FIELDS)
AGENT_EXTRA_FIELDS: dict[str, tuple[str, ...]] = {
    "vision_requirement": ("image",),
    "self_healing": ("failure", "logs", "root_cause", "patch", "test_result"),
}


def to_ml_record(backend_record: dict[str, Any]) -> dict[str, Any]:
    """Convert a backend dataset record (agent/instruction/input/output[/...])
    into the ml record format (expected_output/metadata).

    Self-healing conformance: contract A10 requires root_cause/patch/
    test_result INSIDE expected_output; the backend keeps them as top-level
    fields, so they are folded in (and restored by `to_backend_record`)."""
    agent = backend_record.get("agent")
    if agent not in AGENT_DIRS:
        raise ValueError(f"unknown agent {agent!r}")
    expected = dict(backend_record.get("output") or {})
    extra: dict[str, Any] = {}
    for field in AGENT_EXTRA_FIELDS.get(agent, ()):
        if backend_record.get(field) is not None:
            extra[field] = backend_record[field]
    if agent == "self_healing":
        for field in ("root_cause", "patch", "test_result"):
            if field in extra:
                expected.setdefault(field, extra[field])
    record: dict[str, Any] = {
        "agent": agent,
        "instruction": backend_record.get("instruction", ""),
        "input": backend_record.get("input", ""),
        "expected_output": expected,
        "metadata": backend_record.get("meta", {}) or {"source": "backend_scaffold"},
    }
    record.update(extra)
    return record


def to_backend_record(ml_record: dict[str, Any]) -> dict[str, Any]:
    """Inverse conversion (ml → backend DatasetRecord kwargs)."""
    output = dict(ml_record.get("expected_output") or {})
    record: dict[str, Any] = {
        "agent": ml_record["agent"],
        "instruction": ml_record["instruction"],
        "input": ml_record["input"],
        "output": output,
    }
    if ml_record.get("metadata"):
        record["meta"] = ml_record["metadata"]
    for field in AGENT_EXTRA_FIELDS.get(ml_record["agent"], ()):
        if ml_record.get(field) is not None:
            record[field] = ml_record[field]
        elif ml_record["agent"] == "self_healing" and field in output:
            record[field] = output[field]  # restore A10 fields folded in
    return record


def parse_json_object(text: Any) -> dict[str, Any] | None:
    """Best-effort JSON-object parse; None when the value is not an object."""
    if isinstance(text, dict):
        return text
    if not isinstance(text, str):
        return None
    try:
        obj = json.loads(text)
        return obj if isinstance(obj, dict) else None
    except json.JSONDecodeError:
        return None
