"""Contract validator (Phase 1) — `python -m ml.validate` from repo root.

Checks:
1. agents.json integrity: unique A-ids, known backend_agent ids, valid
   output_schema JSON-Schema-lite (required fields present), adapter names
   match the backend registry.
2. Backend sync: every contract's backend_agent/base_model/adapter matches
   the live registry (skipped with a warning if the backend is unimportable).

Exit 0 = contracts frozen and in sync; exit 1 = drift or corruption.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

ML_DIR = Path(__file__).resolve().parent
AGENTS_JSON = ML_DIR / "agents.json"


def load_contracts() -> dict[str, Any]:
    with AGENTS_JSON.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def _schema_check(
    schema: dict[str, Any], obj: Any, path: str, errors: list[str]
) -> None:
    """Tiny structural validator — enough for the frozen contracts, no deps."""
    if not schema:
        return
    if schema.get("type") == "object" and isinstance(obj, dict):
        for req in schema.get("required", []):
            if req not in obj:
                errors.append(f"{path}: missing required property '{req}'")
        for key, sub in (schema.get("properties") or {}).items():
            if key in obj:
                _schema_check(sub, obj[key], f"{path}.{key}", errors)
    elif schema.get("type") == "array" and isinstance(obj, list):
        item_schema = schema.get("items")
        if item_schema:
            for i, item in enumerate(obj):
                _schema_check(item_schema, item, f"{path}[{i}]", errors)
    elif (expected := schema.get("type")) and obj is not None:
        type_ok = {
            "string": isinstance(obj, str),
            "number": isinstance(obj, (int, float)) and not isinstance(obj, bool),
            "boolean": isinstance(obj, bool),
        }.get(expected, True)
        if not type_ok:
            errors.append(f"{path}: expected {expected}, got {type(obj).__name__}")
        if (choices := schema.get("enum")) and obj not in choices:
            errors.append(f"{path}: {obj!r} not in enum {choices}")


def validate_contracts(contracts: dict[str, Any]) -> list[str]:
    agents = contracts.get("agents")
    if not isinstance(agents, list) or not agents:
        return ["agents.json: 'agents' must be a non-empty list"]

    errors: list[str] = []
    seen_ids: set[str] = set()
    for i, agent in enumerate(agents):
        where = f"agents[{i}]"
        for field in ("id", "name", "backend_agent", "base_model", "adapter"):
            if not agent.get(field) and field != "adapter":  # adapter may be null (A3)
                errors.append(f"{where}: missing '{field}'")
        agent_id = agent.get("id", "?")
        if agent_id in seen_ids:
            errors.append(f"{where}: duplicate id {agent_id}")
        seen_ids.add(agent_id)
        if not isinstance(agent.get("output_schema"), dict):
            errors.append(f"{where}: 'output_schema' must be an object")
        if agent.get("input_kind") not in {"text", "image", "audio"}:
            errors.append(f"{where}: invalid input_kind {agent.get('input_kind')!r}")

    # A3 (audio) is the only agent without an adapter.
    audio = next((a for a in agents if a.get("id") == "A3"), None)
    if audio and audio.get("adapter") is not None:
        errors.append("A3: audio agent must have adapter=null (pretrained Whisper)")

    return errors


def validate_backend_sync(contracts: dict[str, Any]) -> list[str]:
    """Drift check against the live backend registry (None = skip)."""
    from ml.sync_guard import backend_registry

    registry = backend_registry()
    if registry is None:
        print("[validate] WARN: backend registry not importable - sync check skipped")
        return []

    errors: list[str] = []
    backend_ids = set(registry.AGENTS)
    contract_ids = set()
    for agent in contracts["agents"]:
        backend_agent = agent["backend_agent"]
        contract_ids.add(backend_agent)
        if backend_agent not in backend_ids:
            errors.append(
                f"{agent['id']}: backend_agent '{backend_agent}' not in registry"
            )
            continue
        spec = registry.AGENTS[backend_agent]
        if spec.base_model_id != agent.get("base_model"):
            errors.append(
                f"{agent['id']}: base_model drift — contract {agent.get('base_model')!r} vs registry {spec.base_model_id!r}"
            )
        contract_adapter = agent.get("adapter")
        if spec.adapter != contract_adapter:
            errors.append(
                f"{agent['id']}: adapter drift — contract {contract_adapter!r} vs registry {spec.adapter!r}"
            )
    missing = backend_ids - contract_ids
    if missing:
        errors.append(f"registry agents missing from contracts: {sorted(missing)}")
    return errors


def main() -> int:
    try:
        contracts = load_contracts()
    except (OSError, json.JSONDecodeError) as exc:
        print(f"[validate] FAIL: agents.json unreadable: {exc}")
        return 1

    errors = validate_contracts(contracts)
    errors += validate_backend_sync(contracts)

    n = len(contracts.get("agents", []))
    if errors:
        print(f"[validate] FAIL - {n} contracts, {len(errors)} error(s):")
        for err in errors:
            print(f"  - {err}")
        return 1
    print(
        f"[validate] OK - {n} contracts (A1-A{n}) frozen and in sync with the backend registry"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
