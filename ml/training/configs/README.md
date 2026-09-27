# Training configs

One reproducible hyperparameter snapshot per fine-tuned agent. Configs are
**committed**; the weights they produce are **not** (see `.gitignore`).

- `requirement_analysis.json` — the A1 QLoRA recipe (Phase 8 of the roadmap).
  Values match `ml/training/adapter_registry.DEFAULT_HYPERPARAMS` and the
  frozen contract in `ml/agents.json`, so config / trainer / backend registry
  cannot drift apart (CI enforces the registry half via `python -m ml.validate`).

## How they are consumed

Today `ml/training/lora_finetune.py` takes the same values as CLI flags:

```bash
python ml/training/lora_finetune.py \
    --agent requirement_analysis \
    --base Qwen/Qwen3-8B \
    --epochs 3 --qlora
```

The JSON files are the record of what was actually run; when the trainer
grows a `--config` flag it will read exactly these files.

## Promotion gate

The `promotion` block freezes the bar a trained adapter must clear before
`adapter_registry.export_to_backend()` flips it into serving:

1. Evaluate on the **golden** test set (`ml/evaluation/golden/`), never on
   train/val.
2. `json_validity >= 0.95` and `field_accuracy >= baseline + 0.05`.
3. Only then push to the HF Model Hub (`ml/inference/huggingface/push_adapter.py`)
   and mark the adapter trained.
