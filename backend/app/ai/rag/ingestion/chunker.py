"""Structure-aware chunker (spec §5) — the strategy table per source type.

Plain prose (documents) uses heading/paragraph aware sliding windows; code
sources (SQL, Python, Airflow DAGs) chunk on their grammatical blocks so a
CREATE TABLE or a DAG task stays intact; incidents chunk on
Incident→Error→Root cause→Fix→Result sections. A short title/context header
is prepended to every chunk so each piece is self-describing for retrieval.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

MAX_CHUNK_CHARS = 900
OVERLAP_CHARS = 120

# Source types that parse as code (kept structurally intact, never split mid-block).
_CODE_TYPES = {"sql", "python", "dag"}

_INCIDENT_SECTION_RE = re.compile(
    r"^(incident|error|root cause|fix|result|cause|resolution|summary)\s*:",
    re.IGNORECASE | re.MULTILINE,
)
_SQL_BLOCK_RE = re.compile(r"\b(CREATE\s+(?:OR\s+REPLACE\s+)?TABLE|CREATE\s+INDEX|ALTER\s+TABLE)\b", re.I)
_PY_BLOCK_RE = re.compile(r"^(?:class |def |    def |async def )", re.M)


@dataclass
class Chunk:
    index: int
    text: str
    section: str | None = None  # heading / block name for metadata
    meta: dict = field(default_factory=dict)


def chunk(
    text: str,
    *,
    source_type: str = "document",
    title: str = "",
    max_chars: int = MAX_CHUNK_CHARS,
    overlap: int = OVERLAP_CHARS,
) -> list[Chunk]:
    """Dispatch to the strategy for `source_type`; never returns [] for text."""
    text = (text or "").strip()
    if not text:
        return []
    if source_type in _CODE_TYPES:
        pieces = _chunk_code(text, max_chars)
    elif source_type == "incident":
        pieces = _chunk_incident(text, max_chars)
    else:
        pieces = _chunk_prose(text, max_chars, overlap)

    out: list[Chunk] = []
    header = f"{title}\n" if title else ""
    for i, (piece, section) in enumerate(pieces):
        out.append(
            Chunk(index=i, text=f"{header}{piece}".strip(), section=section)
        )
    return out


# --------------------------------------------------------------------------- #
# Strategies
# --------------------------------------------------------------------------- #
def _chunk_prose(text: str, max_chars: int, overlap: int) -> list[tuple[str, str | None]]:
    """Markdown/heading → paragraph-aware sliding window (fallback: chars)."""
    sections = _split_sections(text)
    pieces: list[tuple[str, str | None]] = []
    for heading, body in sections:
        for para in _split_paragraphs(body):
            if len(para) <= max_chars:
                pieces.append((para, heading))
                continue
            # Long paragraph → sliding window inside the section
            step = max(max_chars - overlap, 1)
            for start in range(0, len(para), step):
                piece = para[start : start + max_chars].strip()
                if piece:
                    pieces.append((piece, heading))
                if start + max_chars >= len(para):
                    break
    return pieces or [(text, None)]


def _split_sections(text: str) -> list[tuple[str | None, str]]:
    """Split on markdown headings (## …) or ALL-CAPS section lines."""
    lines = text.split("\n")
    sections: list[tuple[str | None, list[str]]] = [(None, [])]
    for line in lines:
        if re.match(r"^#{1,6}\s+\S", line) or re.match(r"^[A-Z][A-Z \-/]{4,}$", line.rstrip()):
            sections.append((line.lstrip("# ").strip(), []))
        else:
            sections[-1][1].append(line)
    return [(h, "\n".join(body).strip()) for h, body in sections if "\n".join(body).strip()]


def _split_paragraphs(body: str) -> list[str]:
    return [p.strip() for p in re.split(r"\n\s*\n", body) if p.strip()]


def _chunk_code(text: str, max_chars: int) -> list[tuple[str, str | None]]:
    """SQL: one chunk per CREATE/ALTER block. Python/DAG: per class/function.

    Oversized blocks fall back to an internal sliding window so nothing is
    silently dropped.
    """
    if _SQL_BLOCK_RE.search(text):
        return _split_keeps(text, _SQL_BLOCK_RE, max_chars)
    blocks: list[str] = []
    current: list[str] = []
    for line in text.split("\n"):
        if _PY_BLOCK_RE.match(line) and current and len("\n".join(current)) > 40:
            blocks.append("\n".join(current))
            current = [line]
        else:
            current.append(line)
    if current:
        blocks.append("\n".join(current))
    pieces: list[tuple[str, str | None]] = []
    for block in blocks:
        if len(block) <= max_chars:
            pieces.append((block, _block_name(block)))
        else:
            step = max(max_chars - OVERLAP_CHARS, 1)
            for start in range(0, len(block), step):
                piece = block[start : start + max_chars].strip()
                if piece:
                    pieces.append((piece, _block_name(block)))
                if start + max_chars >= len(block):
                    break
    return pieces or [(text, None)]


def _split_keeps(text: str, boundary: re.Pattern[str], max_chars: int) -> list[tuple[str, str | None]]:
    """Split text at regex boundaries (keeping the boundary line)."""
    lines = text.split("\n")
    blocks: list[list[str]] = [[]]
    for line in lines:
        if boundary.search(line) and blocks[-1]:
            blocks.append([line])
        else:
            blocks[-1].append(line)
    pieces: list[tuple[str, str | None]] = []
    for block in blocks:
        joined = "\n".join(block).strip()
        if not joined:
            continue
        if len(joined) <= max_chars:
            pieces.append((joined, _block_name(joined)))
            continue
        step = max(max_chars - OVERLAP_CHARS, 1)
        for start in range(0, len(joined), step):
            piece = joined[start : start + max_chars].strip()
            if piece:
                pieces.append((piece, _block_name(joined)))
            if start + max_chars >= len(joined):
                break
    return pieces


def _block_name(block: str) -> str | None:
    m = re.search(r"(?:TABLE|INDEX)\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w.\"`]+)", block, re.I)
    if m:
        name = m.group(1).strip('"').strip("`")
        return f"table {name}"
    m = re.search(r"^(?:async\s+)?def\s+(\w+)|^class\s+(\w+)", block, re.M)
    if m:
        return m.group(1) or m.group(2)
    return None


def _chunk_incident(text: str, max_chars: int) -> list[tuple[str, str | None]]:
    """Incident → Error → Root cause → Fix → Result each become their own chunk
    (with the preceding context carried in the header)."""
    sections: list[tuple[str | None, str]] = []
    current_head: str | None = "incident"
    current: list[str] = []
    for line in text.split("\n"):
        m = _INCIDENT_SECTION_RE.match(line.strip())
        if m:
            if current and "\n".join(current).strip():
                sections.append((current_head, "\n".join(current).strip()))
            current_head = m.group(1).lower()
            current = [line]
        else:
            current.append(line)
    if current and "\n".join(current).strip():
        sections.append((current_head, "\n".join(current).strip()))

    pieces: list[tuple[str, str | None]] = []
    for head, body in sections:
        if len(body) <= max_chars:
            pieces.append((body, head))
            continue
        step = max(max_chars - OVERLAP_CHARS, 1)
        for start in range(0, len(body), step):
            piece = body[start : start + max_chars].strip()
            if piece:
                pieces.append((piece, head))
            if start + max_chars >= len(body):
                break
    return pieces or [(text, "incident")]


def looks_like_incident(text: str) -> bool:
    """Heuristic: 2+ incident section labels → use the incident strategy."""
    return len(_INCIDENT_SECTION_RE.findall(text)) >= 2
