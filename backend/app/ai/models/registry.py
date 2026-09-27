"""Model-layer registry — static, code-owned model configuration.

Implements the recommended AIDEN model architecture:

    Base A  general  Qwen3-8B/14B          → requirement, architecture,
                                             planning, rca, documentation
    Base B  coder   Qwen2.5-Coder-7B/14B  → sql, pipeline_code, validation,
                                             self_healing
    Base C  vision  Qwen2.5-VL-7B         → vision_requirement
    Base D  audio   whisper-large-v3      → audio transcription (pretrained)

11 agents ride on these 4 bases through 8 LoRA adapters (audio stays
pretrained). The registry is the single source of truth consumed by the
serving router, the orchestrator, and the eval/train tooling — the same
mapping trains the adapters, evaluates them, and serves them.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class BaseModelSpec:
    """A shared base model. `local_tag` is the Ollama tag this deployment
    pulls; `hf_id` the HuggingFace identifier used by the training scripts."""

    id: str
    role: str  # general | coder | vision | audio
    family: str
    local_tag: str
    hf_id: str
    quantization: str  # ollama tag suffix / quant for local serving
    notes: str = ""


@dataclass(frozen=True)
class LoRAAdapterSpec:
    """An agent-specific adapter on top of a base model."""

    name: str
    base_model_id: str
    agents: tuple[str, ...]
    rank: int = 16
    alpha: int = 32
    dropout: float = 0.05
    target_modules: tuple[str, ...] = ("q_proj", "k_proj", "v_proj", "o_proj")
    trained: bool = False  # flipped by the LoRA training pipeline

    # Phase 11+ — Hugging Face deployment tracking
    # Set these once the adapter is trained and pushed to the Hub.
    hf_repo: str | None = None           # e.g. "Bharath-k-s/AIDEN-requirement-agent"
    hf_adapter_repo: str | None = None   # separate repo for the adapter-only weights
    serving_provider: str = "ollama"     # ollama | huggingface | transformers
    deployment_mode: str = "base"        # base | adapter | endpoint


@dataclass(frozen=True)
class AgentSpec:
    """One of the 11 AIDEN agents."""

    id: str
    no: int
    title: str
    role: str
    base_model_id: str
    adapter: str | None  # None = rides the pretrained base (no fine-tune)
    input_kinds: tuple[str, ...]  # text | image | audio
    fallback_model_id: str  # degraded-mode model (smaller variant of same base)
    fine_tune: bool = True
    notes: str = ""


# --------------------------------------------------------------------------- #
# Base models (4)
# --------------------------------------------------------------------------- #
BASE_MODELS: dict[str, BaseModelSpec] = {
    "base_a_general": BaseModelSpec(
        id="base_a_general",
        role="general",
        family="Qwen3",
        local_tag="qwen3:8b",
        hf_id="Qwen/Qwen3-8B",
        quantization="q4_K_M",
        notes="General reasoning base. Use the 14B variant (qwen3:14b) when GPU RAM allows.",
    ),
    "base_b_coder": BaseModelSpec(
        id="base_b_coder",
        role="coder",
        family="Qwen2.5-Coder",
        local_tag="qwen2.5-coder:7b",
        hf_id="Qwen/Qwen2.5-Coder-7B-Instruct",
        quantization="q4_K_M",
        notes="Coding base. Use the 14B variant (qwen2.5-coder:14b) for self-healing/patch quality.",
    ),
    "base_c_vision": BaseModelSpec(
        id="base_c_vision",
        role="vision",
        family="Qwen2.5-VL",
        local_tag="qwen2.5vl:7b",
        hf_id="Qwen/Qwen2.5-VL-7B-Instruct",
        quantization="q4_K_M",
        notes="Vision-language base for architecture/diagram image understanding.",
    ),
    "base_d_audio": BaseModelSpec(
        id="base_d_audio",
        role="audio",
        family="Whisper",
        local_tag="whisper-large-v3",
        hf_id="openai/whisper-large-v3",
        quantization="pretrained",
        notes="Speech-to-text only; kept pretrained — the LLM agents consume its transcript.",
    ),
}

# --------------------------------------------------------------------------- #
# LoRA adapters (8 — audio never gets one)
# --------------------------------------------------------------------------- #
LORA_ADAPTERS: dict[str, LoRAAdapterSpec] = {
    "requirement_adapter": LoRAAdapterSpec(
        name="requirement_adapter",
        base_model_id="base_a_general",
        agents=("requirement_analysis",),
    ),
    "architecture_adapter": LoRAAdapterSpec(
        name="architecture_adapter",
        base_model_id="base_a_general",
        agents=("architecture",),
    ),
    "planning_adapter": LoRAAdapterSpec(
        name="planning_adapter",
        base_model_id="base_a_general",
        agents=("pipeline_planning",),
    ),
    "rca_adapter": LoRAAdapterSpec(
        name="rca_adapter",
        base_model_id="base_a_general",
        agents=("monitoring_rca",),
    ),
    "documentation_adapter": LoRAAdapterSpec(
        name="documentation_adapter",
        base_model_id="base_a_general",
        agents=("documentation_knowledge",),
    ),
    "sql_adapter": LoRAAdapterSpec(
        name="sql_adapter",
        base_model_id="base_b_coder",
        agents=("sql_data",),
    ),
    "pipeline_code_adapter": LoRAAdapterSpec(
        name="pipeline_code_adapter",
        base_model_id="base_b_coder",
        agents=("pipeline_code",),
    ),
    "validation_self_healing_adapter": LoRAAdapterSpec(
        name="validation_self_healing_adapter",
        base_model_id="base_b_coder",
        agents=("validation", "self_healing"),
    ),
    "vision_adapter": LoRAAdapterSpec(
        name="vision_adapter",
        base_model_id="base_c_vision",
        agents=("vision_requirement",),
    ),
}

# --------------------------------------------------------------------------- #
# The 11 agents
# --------------------------------------------------------------------------- #
AGENTS: dict[str, AgentSpec] = {
    "requirement_analysis": AgentSpec(
        id="requirement_analysis",
        no=1,
        title="Requirement Analysis Agent",
        role="architect",
        base_model_id="base_a_general",
        adapter="requirement_adapter",
        input_kinds=("text",),
        fallback_model_id="qwen3:4b",
        notes="Text → structured pipeline requirement (normalized JSON).",
    ),
    "vision_requirement": AgentSpec(
        id="vision_requirement",
        no=2,
        title="Vision / Diagram Analysis Agent",
        role="architect",
        base_model_id="base_c_vision",
        adapter="vision_adapter",
        input_kinds=("image",),
        fallback_model_id="qwen2.5vl:3b",
        notes="Architecture/data-flow image → components + connections JSON.",
    ),
    "audio_requirement": AgentSpec(
        id="audio_requirement",
        no=3,
        title="Audio Requirement Agent",
        role="architect",
        base_model_id="base_d_audio",
        adapter=None,  # pretrained Whisper → transcript → Requirement Agent
        input_kinds=("audio",),
        fallback_model_id="whisper-medium",
        fine_tune=False,
        notes="Speech → transcript (Whisper) → requirement JSON (Base A).",
    ),
    "architecture": AgentSpec(
        id="architecture",
        no=4,
        title="Architecture Agent",
        role="architect",
        base_model_id="base_a_general",
        adapter="architecture_adapter",
        input_kinds=("text",),
        fallback_model_id="qwen3:4b",
        notes="Requirement JSON → architecture components + connections.",
    ),
    "pipeline_planning": AgentSpec(
        id="pipeline_planning",
        no=5,
        title="Pipeline Planning Agent",
        role="architect",
        base_model_id="base_a_general",
        adapter="planning_adapter",
        input_kinds=("text",),
        fallback_model_id="qwen3:4b",
        notes="Architecture → pipeline DAG (tasks + dependencies).",
    ),
    "sql_data": AgentSpec(
        id="sql_data",
        no=6,
        title="SQL / Data Analysis Agent",
        role="builder",
        base_model_id="base_b_coder",
        adapter="sql_adapter",
        input_kinds=("text",),
        fallback_model_id="qwen2.5-coder:3b",
        notes="Schema + requirement → SQL analysis/generation/optimization.",
    ),
    "pipeline_code": AgentSpec(
        id="pipeline_code",
        no=7,
        title="Pipeline Code Generation Agent",
        role="builder",
        base_model_id="base_b_coder",
        adapter="pipeline_code_adapter",
        input_kinds=("text",),
        fallback_model_id="qwen2.5-coder:3b",
        notes="Pipeline spec → Python/Airflow/dbt/Spark code (never deploys directly).",
    ),
    "validation": AgentSpec(
        id="validation",
        no=8,
        title="Validation / Testing Agent",
        role="qa",
        base_model_id="base_b_coder",
        adapter="validation_self_healing_adapter",
        input_kinds=("text",),
        fallback_model_id="qwen2.5-coder:3b",
        notes="Validate SQL/code/DAG/schema — LLM + deterministic validators.",
    ),
    "monitoring_rca": AgentSpec(
        id="monitoring_rca",
        no=9,
        title="Monitoring / RCA Agent",
        role="healer",
        base_model_id="base_a_general",
        adapter="rca_adapter",
        input_kinds=("text",),
        fallback_model_id="qwen3:4b",
        notes="Logs + metrics + RAG context → root cause + confidence.",
    ),
    "self_healing": AgentSpec(
        id="self_healing",
        no=10,
        title="Self-Healing Agent",
        role="healer",
        base_model_id="base_b_coder",
        adapter="validation_self_healing_adapter",
        input_kinds=("text",),
        fallback_model_id="qwen2.5-coder:3b",
        notes="RCA → candidate repair patch (sandboxed validation before approval).",
    ),
    "documentation_knowledge": AgentSpec(
        id="documentation_knowledge",
        no=11,
        title="Documentation / Knowledge Agent",
        role="orchestrator",
        base_model_id="base_a_general",
        adapter="documentation_adapter",
        input_kinds=("text",),
        fallback_model_id="qwen3:4b",
        notes="Pipeline docs, incident summaries, data dictionary, RAG extraction.",
    ),
}

# Convenience views ---------------------------------------------------------- #
AGENT_ROUTES: dict[str, dict[str, str]] = {
    agent_id: {
        "base_model": spec.base_model_id,
        "adapter": spec.adapter or "",
        "fallback_model": spec.fallback_model_id,
    }
    for agent_id, spec in AGENTS.items()
}

_ALL_ADAPTER_NAMES = set(LORA_ADAPTERS)


def agent_ids() -> list[str]:
    return list(AGENTS)


def base_model_for_agent(agent_id: str) -> BaseModelSpec:
    spec = AGENTS.get(agent_id)
    if spec is None:
        raise KeyError(f"Unknown agent: {agent_id}")
    return BASE_MODELS[spec.base_model_id]


def lora_adapter_for_agent(agent_id: str) -> LoRAAdapterSpec | None:
    spec = AGENTS.get(agent_id)
    if spec is None:
        raise KeyError(f"Unknown agent: {agent_id}")
    if spec.adapter is None:
        return None
    return LORA_ADAPTERS[spec.adapter]


def adapter_for_agent(agent_id: str) -> str | None:
    adapter = lora_adapter_for_agent(agent_id)
    return adapter.name if adapter else None


def resolve_model_ref(agent_id: str) -> str:
    """Local serving tag for an agent: base tag (+ adapter marker when trained).

    When the agent's LoRA adapter is not yet trained (the current state —
    eval-dataset-first) the base tag is returned; once `trained` flips on the
    adapter spec the `base+adapter` ref is served instead.
    """
    spec = AGENTS[agent_id]
    base = BASE_MODELS[spec.base_model_id]
    adapter = lora_adapter_for_agent(agent_id)
    if adapter and adapter.trained:
        return f"{base.local_tag}+{adapter.name}"
    return base.local_tag


def route_table() -> list[dict]:
    """Human/JSON-friendly routing table for docs, /status and the agents UI."""
    rows: list[dict] = []
    for spec in AGENTS.values():
        base = BASE_MODELS[spec.base_model_id]
        adapter = lora_adapter_for_agent(spec.id)
        rows.append(
            {
                "no": spec.no,
                "agent": spec.id,
                "title": spec.title,
                "role": spec.role,
                "base_model": base.id,
                "base_family": base.family,
                "serving_tag": resolve_model_ref(spec.id),
                "adapter": adapter.name if adapter else None,
                "adapter_trained": adapter.trained if adapter else None,
                "fallback_model": spec.fallback_model_id,
                "fine_tune": spec.fine_tune,
                "input_kinds": list(spec.input_kinds),
                # Phase 11+ HF deployment tracking
                "hf_repo": adapter.hf_repo if adapter else None,
                "serving_provider": adapter.serving_provider if adapter else "ollama",
                "deployment_mode": adapter.deployment_mode if adapter else "base",
            }
        )
    rows.sort(key=lambda r: r["no"])
    return rows

