"""
Load all trained agents with their fine-tuned models.

When a fine-tuned adapter exists (e.g. ./models/intent-parser/), it is loaded
on top of the base model specified in settings.INTENT_MODEL.  If no adapter
exists, the agent is marked as ``loaded=False`` and the system falls back to
the default rule-based / non-fine-tuned behaviour.

Usage::

    from app.core.agent_loader import agent_loader

    if agent_loader.get_agent("intent_parser")["loaded"]:
        model = agent_loader.get_agent("intent_parser")["model"]
        tokenizer = agent_loader.get_agent("intent_parser")["tokenizer"]
    else:
        # Use fallback (rule-based intent parser)
        ...
"""

import logging
import os
from typing import Any, Dict, Optional

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

from app.config import settings

# ── Check PEFT availability ──────────────────────────────────────────────────

try:
    from peft import PeftModel
    PEFT_AVAILABLE = True
except ImportError:
    PeftModel = None  # type: ignore[assignment]
    PEFT_AVAILABLE = False

logger = logging.getLogger(__name__)

# ── Agent registry ────────────────────────────────────────────────────────

AGENT_DEFINITIONS: Dict[str, Dict[str, Any]] = {
    "intent_parser": {
        "adapter_path": "./models/intent-parser",
        "description": "Natural language → pipeline config (JSON)",
    },
    "self_healing": {
        "adapter_path": "./models/self-healing",
        "description": "Failure detection and auto-repair",
    },
    "monitoring": {
        "adapter_path": "./models/monitoring",
        "description": "Pipeline health and alerts",
    },
    "extraction": {
        "adapter_path": "./models/extraction",
        "description": "Schema discovery and data extraction",
    },
    "pipeline_builder": {
        "adapter_path": "./models/pipeline-builder",
        "description": "Pipeline code generation (Airflow DAGs, dbt models)",
    },
}

# ── Loader ────────────────────────────────────────────────────────────────


class AgentLoader:
    """Loads all trained agents into memory on construction.

    Each agent entry contains:

    - ``model``:       The PEFT-wrapped model (or ``None`` if not loaded).
    - ``tokenizer``:   The associated tokenizer (or ``None``).
    - ``description``: Human-readable description.
    - ``loaded``:      Whether the adapter was loaded successfully.
    - ``adapter_path``: Path on disk.
    """

    def __init__(self):
        self.agents: Dict[str, Dict[str, Any]] = {}
        self._load_all_agents()

    def _load_all_agents(self):
        """Iterate over AGENT_DEFINITIONS and load each available adapter.

        Each agent gets its OWN fresh copy of the base model so PEFT adapter
        weights don't bleed across agents (``PeftModel.from_pretrained``
        modifies the base model object in-place).
        """
        base_model_name = settings.INTENT_MODEL or "meta-llama/Llama-3.2-3B-Instruct"

        for agent_name, config in AGENT_DEFINITIONS.items():
            adapter_path = config["adapter_path"]
            adapter_full_path = os.path.abspath(adapter_path)

            if not os.path.isdir(adapter_full_path):
                logger.info(
                    "Adapter not found for %s at %s -- using fallback",
                    agent_name,
                    adapter_path,
                )
                self.agents[agent_name] = {
                    "model": None,
                    "tokenizer": None,
                    "description": config["description"],
                    "loaded": False,
                    "adapter_path": adapter_path,
                }
                continue

            # Load a FRESH base model for each adapter (PEFT modifies in-place)
            _base_model = None
            _base_tokenizer = None

            try:
                logger.info("Loading base model: %s", base_model_name)
                _base_model = AutoModelForCausalLM.from_pretrained(
                    base_model_name,
                    device_map="auto",
                    trust_remote_code=True,
                )
                _base_tokenizer = AutoTokenizer.from_pretrained(
                    base_model_name,
                    trust_remote_code=True,
                )
                if _base_tokenizer.pad_token is None:
                    _base_tokenizer.pad_token = _base_tokenizer.eos_token

                # Load PEFT adapter on top of a fresh base model
                if not PEFT_AVAILABLE:
                    logger.error(
                        "peft not installed -- cannot load adapter for %s", agent_name
                    )
                    raise ImportError("peft is required to load PEFT adapters")

                try:
                    model = PeftModel.from_pretrained(_base_model, adapter_full_path)
                except Exception as exc:
                    logger.warning(
                        "PEFT load failed for %s: %s -- marking as not loaded",
                        agent_name,
                        exc,
                    )
                    raise

                tokenizer = AutoTokenizer.from_pretrained(adapter_full_path)

                # Evaluate mode
                model.eval()
                if torch.cuda.is_available():
                    model = model.cuda()

                self.agents[agent_name] = {
                    "model": model,
                    "tokenizer": tokenizer,
                    "description": config["description"],
                    "loaded": True,
                    "adapter_path": adapter_path,
                }
                logger.info("✅ Loaded %s agent from %s", agent_name, adapter_path)

            except Exception as exc:
                logger.error("❌ Failed to load %s agent: %s", agent_name, exc)
                self.agents[agent_name] = {
                    "model": None,
                    "tokenizer": None,
                    "description": config["description"],
                    "loaded": False,
                    "adapter_path": adapter_path,
                }

    def get_agent(self, agent_name: str) -> Optional[Dict[str, Any]]:
        """Get a specific agent by name (e.g. ``"intent_parser"``).

        Returns ``None`` if the agent name is not registered.
        """
        return self.agents.get(agent_name)

    def list_loaded(self) -> Dict[str, bool]:
        """Return a dict mapping agent name → loaded status."""
        return {name: info["loaded"] for name, info in self.agents.items()}


# ── Singleton instance ────────────────────────────────────────────────────

agent_loader = AgentLoader()
