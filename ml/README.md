# AIDEN ML — Fine-Tuning Workspace

Training / evaluation workspace for the 11-agent model layer. The backend
(`backend/app/ai/models/`) owns **serving**; this directory owns
**contracts, datasets, preprocessing, training, evaluation, and adapter
artifacts**. The two are kept in lockstep by a sync guard (see below).

## Layout

```
ml/
├── agents.json          A1–A11 frozen contracts (Phase 1) — synced to backend registry
├── validate.py          Validate agents.json + backend sync (exit 1 on drift)
├── sync_guard.py        Import backend registry from ml tooling
├── datasets/            Phase 2 — one dir per agent
│   ├── requirement/     raw.jsonl → train/val/test.jsonl (80/10/10)
│   ├── vision/  audio/  architecture/  pipeline/  sql/  code/
│   └── validation/  rca/  self_healing/  documentation/
├── preprocessing/       Phase 4 — clean, dedupe, normalize, validate
├── training/            Phase 6+ — LoRA/QLoRA (peft+trl), adapter export, configs/
├── evaluation/          Phase 5/16 — metrics engine + baseline runner + golden/
├── adapters/            Fine-tuned adapter artifacts (gitignored until exported)
├── models/              Base-model references (no weights committed)
├── inference/           Serving paths: local/ (Ollama), huggingface/ (adapters,
│                        push_adapter.py), transformers/ (GPU eval loading)
└── experiments/         Run reports (gitignored)
```

## Roadmap phases → where they live

| Phase | Scope | Here |
|---|---|---|
| 0 | ML workspace + training env | this dir + `requirements-ml.txt` |
| 1 | Freeze 11 agent contracts | `agents.json` + `validate.py` |
| 2 | Dataset architecture | `datasets/<agent>/` record format |
| 3–4 | Collect, clean, annotate, split | `preprocessing/`, `scripts/prepare_datasets.py` |
| 5 | Baseline before fine-tuning | `evaluation/run_baseline.py` (A1: 0.332 field acc on 106 golden examples) |
| 6–13 | Per-agent LoRA fine-tunes (A1 → A11) | `training/lora_finetune.py` |
| 14 | Multi-agent orchestration | backend `OrchestratorService` (already routed) |
| 15 | RAG | backend `app/ai/rag/` (already built) |
| 16 | Fixed test sets + per-agent metrics | `evaluation/` (100/agent targets) |
| 17 | FastAPI integration | backend `/agents/model/*` (already live) |
| 18 | Frontend multimodal | Requirement Studio (text/image/audio modes exist) |
| 19 | Governance + human approval | backend approval gates (already built) |
| 20 | Production | Render/Vercel deployment (existing pipeline) |

## Vertical slices (recommended order)

1. **Slice 1** — Requirement → Image → Audio → Architecture → Pipeline (A1–A5)
2. **Slice 2** — SQL → Code → Validation (A6–A8)
3. **Slice 3** — RCA → Self-Healing → Documentation (A9–A11)

## Checkpoint rule (every phase)

```
IMPLEMENT → UNIT TEST → MODEL TEST → INTEGRATION TEST → FAILURE TEST → DOCUMENT → COMMIT → NEXT
```

## Commands

```bash
# from repo root (aiden/), using the backend venv
backend/venv/Scripts/python.exe -m ml.validate                 # Phase 1 sync guard

# datasets: backend scaffold → per-agent dirs → 80/10/10 splits
backend/venv/Scripts/python.exe ml/scripts/prepare_datasets.py --source backend-scaffold

# baseline eval (heuristic engine; add --use-model with Ollama up)
backend/venv/Scripts/python.exe ml/evaluation/run_baseline.py --all --limit 20
```

Training requires the ML extras (`pip install -r ml/requirements-ml.txt`)
and is **never** run by the backend or CI — heavy deps stay out of the app.
