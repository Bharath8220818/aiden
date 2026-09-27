"""Seed dataset generator — canonical import for the starter sample set.

The generator itself lives in `builder.py` (it shares the per-agent
generators); this module is the stable public entrypoint so tooling and
tests can `from app.ai.datasets.seeds import generate_seed_dataset`.
"""

from __future__ import annotations

from app.ai.datasets.builder import SEED, generate_seed_dataset

__all__ = ["SEED", "generate_seed_dataset"]
