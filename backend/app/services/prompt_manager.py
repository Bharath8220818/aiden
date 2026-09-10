"""AIDEN LLMOps — Prompt Manager (Stage 3.4).

Versioned prompt templates with variable interpolation. ``get_prompt``
resolves "latest" to the highest declared version so new versions can be
A/B tested by pinning an explicit version per agent/session.
"""
from typing import Dict, Optional


class PromptManager:
    """Registry of versioned prompt templates."""

    PROMPTS: Dict[str, Dict[str, str]] = {
        "sql_generation": {
            "v1": "Generate SQL for: {requirement}",
            "v2": (
                "You are an expert SQL engineer. Generate {dialect} SQL for: {requirement}. "
                "Available tables: {tables}. Return only the SQL."
            ),
        },
        "pipeline_generation": {
            "v1": "Create an Airflow DAG that: {requirement}",
            "v2": (
                "You are a data pipeline architect. Design an Airflow DAG for: {requirement}. "
                "Include retries, alerting, and data-quality checks."
            ),
        },
        "incident_diagnosis": {
            "v1": "Diagnose this failure: {error}",
            "v2": (
                "You are AIDEN Debug Agent. Reconstruct the incident timeline from: {error}. "
                "List probable root causes with confidence scores, then propose fixes."
            ),
        },
    }

    @classmethod
    def get_prompt(cls, name: str, version: str = "latest", **kwargs) -> str:
        versions = cls.PROMPTS.get(name)
        if not versions:
            raise KeyError(f"Unknown prompt: {name}")
        if version == "latest":
            version = max(versions.keys())
        template = versions.get(version)
        if template is None:
            raise KeyError(f"Prompt {name} has no version {version}")
        return template.format(**kwargs) if kwargs else template

    @classmethod
    def list_prompts(cls) -> Dict[str, list]:
        return {name: sorted(versions.keys()) for name, versions in cls.PROMPTS.items()}

    @classmethod
    def register_version(cls, name: str, version: str, template: str) -> None:
        cls.PROMPTS.setdefault(name, {})[version] = template
