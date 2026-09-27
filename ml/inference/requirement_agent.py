"""AIDEN Requirement Agent — local inference (Phase 5, step 8).

Serving paths, in priority order:

1. `--adapter <dir>`   merged/base+LoRA model dir or HF repo id via
                       transformers+peft (GPU; the trained AIDEN adapter)
2. `--tag <tag>`       Ollama base model (qwen3:8b on the dev machine)
3. `--heuristic`       deterministic needs_clarification stub (no deps)

Output is always the A1 contract JSON (or a status object), so callers can
swap engines without touching downstream schema validation:

    python ml/inference/requirement_agent.py \
        --input "Load CSV files into PostgreSQL every day."

    python ml/inference/requirement_agent.py \
        --adapter ml/models/requirement \
        --input "Move customer data to the warehouse."
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

ML_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = ML_DIR.parent
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(REPO_ROOT / "backend"))

SYSTEM_PROMPT = (
    "You are the AIDEN Requirement Analysis Agent. Convert data-engineering "
    "requirements into valid JSON matching the A1 contract "
    "(source, destination, schedule, transformations, monitoring, "
    "failure_notification). If required information is missing or "
    'contradictory return {"status": "needs_clarification", ...}; if no '
    'pipeline can be defined return {"status": "invalid", "reason": ...}. '
    "Answer with JSON only."
)


# --------------------------------------------------------------------------- #
# Engines
# --------------------------------------------------------------------------- #
def predict_ollama(text: str, tag: str) -> dict[str, Any]:
    import asyncio

    from app.services import ai_client  # backend venv

    raw = asyncio.run(ai_client.chat_json(text, system=SYSTEM_PROMPT, model=tag))
    return (
        raw
        if isinstance(raw, dict)
        else {"status": "invalid", "reason": "non-JSON response"}
    )


def predict_transformers(text: str, adapter: str, base: str | None) -> dict[str, Any]:
    """Load base+LoRA (or a merged model dir) and generate JSON."""
    import torch
    from peft import PeftModel
    from transformers import AutoModelForCausalLM, AutoTokenizer

    model_id = base or _base_from_adapter_config(adapter)
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    model = AutoModelForCausalLM.from_pretrained(
        model_id, torch_dtype="auto", device_map="auto"
    )
    model = PeftModel.from_pretrained(model, adapter)
    model.eval()

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": text},
    ]
    prompt = tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True
    )
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    with torch.no_grad():
        out = model.generate(
            **inputs, max_new_tokens=512, do_sample=False, temperature=None
        )
    raw = tokenizer.decode(
        out[0][inputs["input_ids"].shape[1] :], skip_special_tokens=True
    )
    return extract_json(raw)


def predict_heuristic(text: str) -> dict[str, Any]:
    """Deterministic no-model stub: honest about what it cannot know."""
    lowered = text.lower()
    missing = ["source_system", "destination_warehouse", "schedule"]
    if any(w in lowered for w in ("delete", "drop ", "truncate")):
        return {
            "status": "invalid",
            "reason": "destructive operation - not a data-pipeline requirement",
        }
    return {"status": "needs_clarification", "missing_information": missing}


# --------------------------------------------------------------------------- #
# JSON extraction (models love wrapping JSON in prose / code fences)
# --------------------------------------------------------------------------- #
def extract_json(raw: str) -> dict[str, Any]:
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
    candidate = fenced.group(1) if fenced else raw
    match = re.search(r"\{.*\}", candidate, re.DOTALL)
    if not match:
        return {
            "status": "invalid",
            "reason": f"no JSON object in model output: {raw[:120]}",
        }
    try:
        data = json.loads(match.group(0))
        return (
            data
            if isinstance(data, dict)
            else {"status": "invalid", "reason": "not an object"}
        )
    except json.JSONDecodeError as exc:
        return {"status": "invalid", "reason": f"unparseable JSON: {exc}"}


def _base_from_adapter_config(adapter: str) -> str:
    cfg = Path(adapter) / "adapter_config.json"
    if cfg.exists():
        data = json.loads(cfg.read_text(encoding="utf-8"))
        return str(data.get("base_model_name_or_path") or "Qwen/Qwen3-4B")
    return "Qwen/Qwen3-4B"


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #
def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="requirement_agent", description="AIDEN A1 requirement inference"
    )
    parser.add_argument("--input", required=True, help="natural-language requirement")
    parser.add_argument(
        "--adapter", default=None, help="LoRA adapter dir or HF repo id"
    )
    parser.add_argument(
        "--base", default=None, help="base model id when adapter is a repo"
    )
    parser.add_argument("--tag", default=None, help="Ollama tag (e.g. qwen3:8b)")
    parser.add_argument("--heuristic", action="store_true", help="no-model stub")
    parser.add_argument("--pretty", action="store_true")
    args = parser.parse_args(argv)

    if args.adapter:
        result = predict_transformers(args.input, args.adapter, args.base)
        engine = f"transformers:{args.adapter}"
    elif args.tag:
        result = predict_ollama(args.input, args.tag)
        engine = f"ollama:{args.tag}"
    elif args.heuristic:
        result = predict_heuristic(args.input)
        engine = "heuristic"
    else:
        parser.error("choose an engine: --adapter | --tag | --heuristic")
        return 2

    print(f"# engine: {engine}")
    print(json.dumps(result, indent=2 if args.pretty else None, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
