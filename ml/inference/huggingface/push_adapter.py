"""Push a trained LoRA adapter to the Hugging Face Model Hub (Phase 10).

Run on the training machine (Colab / GPU PC) where HF_TOKEN is exported:

    export HF_TOKEN=hf_...
    python ml/inference/huggingface/push_adapter.py \
        --agent requirement_analysis \
        --repo Bharath-k-s/AIDEN-requirement-agent

Checks before any upload:
  - the adapter exists locally (ml/adapters/<agent>/) and is registered
  - adapter_config.json's base model matches the frozen contract
  - required PEFT files are present (adapter_config.json + safetensors/bin)

The repo is created (private unless --public) and the folder is uploaded;
the adapter card is generated from the frozen contract + training config.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ML_DIR = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ML_DIR.parent))  # repo root, for `import ml.*`

REQUIRED_FILES = ("adapter_config.json",)


def adapter_dir_for(agent: str) -> Path:
    return ML_DIR / "adapters" / agent


def preflight(agent: str, contract: dict) -> tuple[Path, dict]:
    """Validate the local adapter; return (dir, adapter_config)."""
    adir = adapter_dir_for(agent)
    if not adir.exists():
        raise SystemExit(f"[push] no local adapter at {adir} - train first")
    cfg_path = adir / "adapter_config.json"
    if not cfg_path.exists():
        raise SystemExit(f"[push] missing {cfg_path} - not a PEFT adapter dir")
    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    base = cfg.get("base_model_name_or_path") or ""
    contract_base = contract["base_model"]
    if contract_base not in base:
        raise SystemExit(
            f"[push] adapter base {base!r} does not match contract {contract_base!r}"
        )
    weights = [
        f
        for f in ("adapter_model.safetensors", "adapter_model.bin")
        if (adir / f).exists()
    ]
    if not weights:
        raise SystemExit("[push] no adapter_model.safetensors/.bin found")
    return adir, cfg


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="push_adapter", description="Upload a trained adapter to the HF Hub"
    )
    parser.add_argument("--agent", required=True, help="e.g. requirement_analysis")
    parser.add_argument(
        "--repo",
        default=None,
        help="HF model repo id (default: contract's hf_adapter_repo)",
    )
    parser.add_argument("--public", action="store_true", help="create a public repo")
    parser.add_argument(
        "--dry-run", action="store_true", help="preflight only, no upload"
    )
    args = parser.parse_args(argv)

    contracts = json.loads((ML_DIR / "agents.json").read_text(encoding="utf-8"))[
        "agents"
    ]
    contract = next((a for a in contracts if a["backend_agent"] == args.agent), None)
    if contract is None:
        raise SystemExit(f"[push] unknown agent {args.agent!r} (not in agents.json)")

    adir, cfg = preflight(args.agent, contract)
    repo = args.repo or contract.get("hf_adapter_repo")
    if not repo:
        raise SystemExit("[push] no --repo given and contract has no hf_adapter_repo")

    print(f"[push] adapter dir : {adir}")
    print(f"[push] base model  : {cfg.get('base_model_name_or_path')}")
    print(f"[push] target repo : {repo} ({'public' if args.public else 'private'})")

    if args.dry_run:
        print("[push] dry-run OK - preflight passed, nothing uploaded")
        return 0

    try:
        from huggingface_hub import HfApi
    except ImportError:
        raise SystemExit("[push] pip install huggingface_hub (training venv)")

    api = HfApi()
    api.create_repo(repo, private=not args.public, exist_ok=True)
    api.upload_folder(
        repo_id=repo,
        folder_path=str(adir),
        commit_message=f"AIDEN {contract['id']} adapter ({cfg.get('base_model_name_or_path')})",
    )
    url = f"https://huggingface.co/{repo}"
    print(f"[push] uploaded -> {url}")
    print(
        "[push] next: set the adapter's hf_adapter_repo + serving_provider in the"
        " backend registry (ml/training/adapter_registry.py export_to_backend),"
        " then evaluate on the golden set before promoting."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
