"""Adapter registry — tracks fine-tuned LoRA adapters on disk.

State lives in ml/adapters/registry.json (gitignored alongside the weights):
    {"requirement_adapter": {"path": "...", "base_model": "...", "trained_at": "..."}}

`mark_trained` is called by lora_finetune.py after a successful run; the
backend registry stays the source of truth for *serving* — export flips
`trained=True` there via export_to_backend().
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

ML_DIR = Path(__file__).resolve().parents[1]
REGISTRY_PATH = ML_DIR / "adapters" / "registry.json"

DEFAULT_HYPERPARAMS: dict[str, dict[str, Any]] = {
    "default": {
        "rank": 16,
        "alpha": 32,
        "dropout": 0.05,
        "target_modules": ("q_proj", "k_proj", "v_proj", "o_proj"),
    },
}


class AdapterRegistry:
    def __init__(self, path: Path = REGISTRY_PATH) -> None:
        self.path = path
        self._load()

    def _load(self) -> None:
        if self.path.exists():
            self._data: dict[str, Any] = json.loads(
                self.path.read_text(encoding="utf-8")
            )
        else:
            self._data = {}

    def _save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(self._data, indent=2), encoding="utf-8")

    def get(self, adapter_name: str) -> dict[str, Any]:
        """Hyper-params for an adapter (contract defaults)."""
        if adapter_name in self._data:
            return {
                **DEFAULT_HYPERPARAMS["default"],
                **self._data[adapter_name].get("hyperparams", {}),
                "name": adapter_name,
            }
        return {**DEFAULT_HYPERPARAMS["default"], "name": adapter_name}

    def all(self) -> dict[str, Any]:
        return dict(self._data)

    def mark_trained(
        self,
        adapter_name: str,
        artifact_path: str,
        *,
        base_model: str,
        epochs: int,
        qlora: bool,
    ) -> None:
        self._data[adapter_name] = {
            **self._data.get(adapter_name, {}),
            "path": artifact_path,
            "base_model": base_model,
            "epochs": epochs,
            "qlora": qlora,
            "trained_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        self._save()

    def is_trained(self, adapter_name: str) -> bool:
        return bool(self._data.get(adapter_name, {}).get("path"))

    def export_to_backend(self, adapter_name: str) -> bool:
        """Flip trained=True in the backend registry (serving picks base+adapter).

        Requires `dataclasses.replace` on the frozen spec — the backend keeps
        its own registry module state, so this is a manual, explicit step.
        """
        from ml.sync_guard import backend_registry

        registry = backend_registry()
        if registry is None or adapter_name not in registry.LORA_ADAPTERS:
            return False
        entry = self._data.get(adapter_name, {})
        if not entry.get("path"):
            return False
        import dataclasses

        spec = registry.LORA_ADAPTERS[adapter_name]
        registry.LORA_ADAPTERS[adapter_name] = dataclasses.replace(spec, trained=True)
        return True
