"""Dataset schema — one JSONL record format for all 11 agents.

Common record (all agents):
    {
      "agent": "requirement_analysis",
      "instruction": "Convert the user requirement into a pipeline specification",
      "input": "Build a daily ETL from PostgreSQL to Snowflake",
      "output": {...structured target...}
    }

Additional per-agent fields:
    vision_requirement: + image (diagram filename)
    self_healing:       + failure, logs, root_cause, patch, test_result
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

DATASET_VERSION = "1.0"

AGENT_SAMPLE_TARGETS: dict[str, int] = {
    "requirement_analysis": 500,
    "architecture": 500,
    "pipeline_planning": 500,
    "sql_data": 500,
    "pipeline_code": 500,
    "validation": 300,
    "monitoring_rca": 300,
    "self_healing": 300,
    "documentation_knowledge": 200,
    "vision_requirement": 200,
    "audio_requirement": 200,
}

REQUIRED_COMMON_FIELDS = {"agent", "instruction", "input", "output"}

REQUIRED_AGENT_FIELDS: dict[str, set[str]] = {
    "vision_requirement": {"image"},
    "self_healing": {"failure", "logs", "root_cause", "patch", "test_result"},
}

_KNOWN_AGENTS = set(AGENT_SAMPLE_TARGETS)


@dataclass
class DatasetRecord:
    """One eval/fine-tune sample (validated on construction)."""

    agent: str
    instruction: str
    input: str
    output: dict[str, Any]
    image: str | None = None
    failure: str | None = None
    logs: str | None = None
    root_cause: str | None = None
    patch: str | None = None
    test_result: str | None = None
    meta: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if self.agent not in _KNOWN_AGENTS:
            raise ValueError(f"Unknown agent '{self.agent}' — must be one of {sorted(_KNOWN_AGENTS)}")
        missing = REQUIRED_AGENT_FIELDS.get(self.agent, set()) - {
            f for f in REQUIRED_AGENT_FIELDS.get(self.agent, set()) if getattr(self, f) is not None
        }
        if missing:
            raise ValueError(f"Agent '{self.agent}' requires fields {sorted(missing)}")

    def to_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {
            "agent": self.agent,
            "instruction": self.instruction,
            "input": self.input,
            "output": self.output,
        }
        if self.image is not None:
            out["image"] = self.image
        for f in ("failure", "logs", "root_cause", "patch", "test_result"):
            value = getattr(self, f)
            if value is not None:
                out[f] = value
        if self.meta:
            out["meta"] = self.meta
        return out

    def to_json(self) -> str:
        import json

        return json.dumps(self.to_dict(), ensure_ascii=False)
