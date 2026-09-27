"""AIDEN eval/fine-tune datasets — JSONL schema, builders, seed data.

Public API:
    from app.ai.datasets import AGENT_SAMPLE_TARGETS, DatasetRecord, ...
"""

from app.ai.datasets.builder import (
    build_all,
    build_for_agent,
    load_jsonl,
    write_jsonl,
)
from app.ai.datasets.schema import (
    AGENT_SAMPLE_TARGETS,
    DATASET_VERSION,
    REQUIRED_AGENT_FIELDS,
    REQUIRED_COMMON_FIELDS,
    DatasetRecord,
)
from app.ai.datasets.seeds import generate_seed_dataset

__all__ = [
    "AGENT_SAMPLE_TARGETS",
    "DATASET_VERSION",
    "DatasetRecord",
    "REQUIRED_AGENT_FIELDS",
    "REQUIRED_COMMON_FIELDS",
    "build_all",
    "build_for_agent",
    "dataset_dir",
    "generate_seed_dataset",
    "load_jsonl",
    "write_jsonl",
]
