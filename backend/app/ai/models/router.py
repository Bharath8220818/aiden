"""Model router — multimodal input → agent → base-model/adapter decision.

The orchestrator (and any other caller) hands the router a payload tagged
with an input modality. The router:

1. classifies the modality when the caller passed ``auto``,
2. routes audio through Base D (Whisper → transcript) and images through
   Base C (Qwen2.5-VL) so both land on the Requirement Agent as text,
3. resolves the serving model ref from the registry (base tag today,
   ``base+adapter`` once LoRA training lands).

The transport stays `ai_client` (Ollama /api/chat + deterministic
heuristic fallback) — no behavior change when Ollama is absent, but the
model ref and agent prompts now come from one registry.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.ai.models import registry


class AgentInputKind:
    TEXT = "text"
    IMAGE = "image"
    AUDIO = "audio"


@dataclass
class RouteDecision:
    """Resolved routing for one multimodal request."""

    agent_id: str
    input_kind: str
    base_model_id: str
    serving_model_ref: str
    fallback_model_ref: str
    adapter: str | None
    normalized_text: str | None = None  # transcript / extracted image text
    pre_agents: list[dict[str, Any]] = field(default_factory=list)
    notes: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "agent_id": self.agent_id,
            "input_kind": self.input_kind,
            "base_model_id": self.base_model_id,
            "serving_model_ref": self.serving_model_ref,
            "fallback_model_ref": self.fallback_model_ref,
            "adapter": self.adapter,
            "normalized_text": self.normalized_text,
            "pre_agents": self.pre_agents,
            "notes": self.notes,
        }


def _looks_like_audio(payload: dict[str, Any]) -> bool:
    audio = payload.get("audio") or {}
    if isinstance(audio, dict) and (audio.get("transcript") or audio.get("durationSeconds")):
        return True
    return "audio_url" in payload or "audio_base64" in payload


def _looks_like_image(payload: dict[str, Any]) -> bool:
    if isinstance(payload.get("image"), (dict, str)):
        return True
    return bool(payload.get("diagram")) or "image_url" in payload or "image_base64" in payload


def classify_input_kind(payload: dict[str, Any]) -> str:
    """Modality sniffing for `auto` — text unless image/audio signals exist."""
    if _looks_like_audio(payload):
        return AgentInputKind.AUDIO
    if _looks_like_image(payload):
        return AgentInputKind.IMAGE
    return AgentInputKind.TEXT


def normalize_text_for_agent(payload: dict[str, Any], input_kind: str) -> str:
    """Best text extraction per modality (audio/image consumers do the heavy
    model calls; here we just gather the text already present)."""
    if input_kind == AgentInputKind.AUDIO:
        audio = payload.get("audio")
        if isinstance(audio, dict):
            return str(audio.get("transcript") or "").strip()
        return str(payload.get("transcript") or "").strip()
    if input_kind == AgentInputKind.IMAGE:
        image = payload.get("image")
        if isinstance(image, dict):
            return str(image.get("description") or image.get("ocr_text") or "").strip()
        if isinstance(payload.get("diagram"), dict):
            return str(payload["diagram"].get("description") or "").strip()
        return ""
    if isinstance(payload.get("text"), dict):
        return str(payload["text"].get("rawText") or "").strip()
    return str(payload.get("text") or payload.get("rawText") or payload.get("prompt") or "").strip()


def route(payload: dict[str, Any], *, input_kind: str = "auto", agent_id: str | None = None) -> RouteDecision:
    """Resolve the full routing decision for one multimodal request.

    - audio → pre-agent Base D transcription, then Base A Requirement Agent
    - image → pre-agent Base C visual extraction, then Base A Requirement Agent
    - text  → straight to the target agent (default: requirement_analysis)
    """
    kind = classify_input_kind(payload) if input_kind == "auto" else input_kind
    if kind not in {AgentInputKind.TEXT, AgentInputKind.IMAGE, AgentInputKind.AUDIO}:
        kind = AgentInputKind.TEXT

    pre_agents: list[dict[str, Any]] = []
    normalized_text: str | None = None

    if kind == AgentInputKind.AUDIO:
        audio_base = registry.BASE_MODELS["base_d_audio"]
        pre_agents.append(
            {
                "agent": "audio_requirement",
                "stage": "transcribe",
                "base_model_id": audio_base.id,
                "serving_model_ref": audio_base.local_tag,
                "fine_tune": False,
            }
        )
        normalized_text = normalize_text_for_agent(payload, kind) or None
        target = "requirement_analysis"
    elif kind == AgentInputKind.IMAGE:
        vision_base = registry.BASE_MODELS["base_c_vision"]
        vision_agent = registry.AGENTS["vision_requirement"]
        pre_agents.append(
            {
                "agent": "vision_requirement",
                "stage": "visual_extract",
                "base_model_id": vision_base.id,
                "serving_model_ref": registry.resolve_model_ref(vision_agent.id),
                "adapter": registry.adapter_for_agent(vision_agent.id),
                "fine_tune": vision_agent.fine_tune,
            }
        )
        normalized_text = normalize_text_for_agent(payload, kind) or None
        target = "requirement_analysis"
    else:
        target = "requirement_analysis"

    if agent_id:
        if agent_id not in registry.AGENTS:
            raise KeyError(f"Unknown agent: {agent_id}")
        target = agent_id

    target_spec = registry.AGENTS[target]
    return RouteDecision(
        agent_id=target,
        input_kind=kind,
        base_model_id=target_spec.base_model_id,
        serving_model_ref=registry.resolve_model_ref(target),
        fallback_model_ref=target_spec.fallback_model_id,
        adapter=registry.adapter_for_agent(target),
        normalized_text=normalized_text,
        pre_agents=pre_agents,
        notes=target_spec.notes,
    )
