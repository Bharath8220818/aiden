"""Cleaner (spec §1 normalize step) — deterministic text normalization."""

from __future__ import annotations

import re


def clean_text(text: str) -> str:
    """Normalize whitespace, drop control chars, collapse link/url noise.

    Deterministic and cheap: same input always yields the same output so
    content hashes stay stable across re-ingestion.
    """
    text = text or ""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" ?\n ?", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()
