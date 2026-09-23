"""Document loaders (spec §4) — parse raw sources into plain text.

Text/Markdown/JSON/CSV/SQL are handled natively; PDF and DOCX use optional
extras (`pymupdf`, `python-docx`) and degrade with a clear message when the
driver is missing — mirroring the database-adapter honesty contract. Format
detection is by extension with content sniffing for extensionless text.
"""

from __future__ import annotations

import json
from typing import Any

from app.core.logging import get_logger

logger = get_logger("aiden.rag.loader")


class LoaderError(ValueError):
    """Raised when a document cannot be parsed (bad input, missing driver)."""


def detect_format(filename: str, content: bytes) -> str:
    """Best-effort format detection: extension first, then content sniffing."""
    name = (filename or "").lower()
    for ext, fmt in (
        (".pdf", "pdf"),
        (".docx", "docx"),
        (".md", "markdown"),
        (".markdown", "markdown"),
        (".csv", "csv"),
        (".json", "json"),
        (".sql", "sql"),
        (".py", "python"),
        (".yaml", "yaml"),
        (".yml", "yaml"),
        (".html", "html"),
        (".htm", "html"),
        (".txt", "text"),
    ):
        if name.endswith(ext):
            return fmt
    head = content[:512].lstrip().lower()
    if head.startswith(b"%pdf"):
        return "pdf"
    if head.startswith((b"{", b"[")):
        return "json"
    if head.startswith(b"<!doctype") or head.startswith(b"<html"):
        return "html"
    return "text"


def load_document(filename: str, content: bytes) -> dict[str, Any]:
    """Parse one uploaded document into {text, format, meta}.

    Raises LoaderError for unreadable inputs; missing optional drivers are
    reported as LoaderError with a human message (honest degradation).
    """
    fmt = detect_format(filename, content)
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        if fmt in {"text", "markdown", "csv", "sql", "python", "json"}:
            text = content.decode("latin-1", errors="replace")
        else:
            text = ""  # binary formats must go through their parser

    if fmt == "pdf":
        text = _load_pdf(content)
    elif fmt == "docx":
        text = _load_docx(content)
    elif fmt == "json":
        text = _load_json(text)
    elif fmt == "csv":
        text = _load_csv(text)
    elif fmt in {"html", "yaml"}:
        text = _strip_tags(text) if fmt == "html" else text

    cleaned = (text or "").strip()
    if not cleaned:
        raise LoaderError(f"Could not extract text from '{filename}' ({fmt})")
    return {"text": cleaned, "format": fmt, "meta": {"filename": filename}}


def _load_pdf(content: bytes) -> str:
    try:
        import fitz  # PyMuPDF

        parts = [page.get_text() for page in fitz.open(stream=content, filetype="pdf")]
        return "\n\n".join(parts)
    except ImportError as exc:
        raise LoaderError(
            "PDF support requires the 'pymupdf' extra (pip install pymupdf)"
        ) from exc
    except Exception as exc:  # noqa: BLE001 — corrupt PDFs are a user-input problem
        raise LoaderError(f"PDF parse failed: {exc}") from exc


def _load_docx(content: bytes) -> str:
    try:
        import io

        import docx  # python-docx

        document = docx.Document(io.BytesIO(content))
        return "\n\n".join(p.text for p in document.paragraphs if p.text.strip())
    except ImportError as exc:
        raise LoaderError(
            "DOCX support requires the 'python-docx' extra (pip install python-docx)"
        ) from exc
    except Exception as exc:  # noqa: BLE001
        raise LoaderError(f"DOCX parse failed: {exc}") from exc


def _load_json(text: str) -> str:
    """Flatten JSON into a readable key-path text (structure preserved)."""
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise LoaderError(f"Invalid JSON: {exc}") from exc

    lines: list[str] = []

    def _walk(node: Any, path: str) -> None:
        if isinstance(node, dict):
            for k, v in node.items():
                _walk(v, f"{path}.{k}" if path else str(k))
        elif isinstance(node, list):
            for i, v in enumerate(node):
                _walk(v, f"{path}[{i}]")
        else:
            lines.append(f"{path}: {node}")

    _walk(data, "")
    return "\n".join(lines)


def _load_csv(text: str) -> str:
    """Normalize CSV rows into 'header: value' pairs (retrieval-friendly)."""
    import csv
    import io

    reader = csv.reader(io.StringIO(text))
    rows = [r for r in reader if any(cell.strip() for cell in r)]
    if not rows:
        raise LoaderError("CSV is empty")
    header = [h.strip() for h in rows[0]]
    out = [f"Columns: {', '.join(header)}"]
    for row in rows[1:]:
        out.append("; ".join(f"{h}: {v.strip()}" for h, v in zip(header, row, strict=False)))
    return "\n".join(out)


def _strip_tags(html: str) -> str:
    import re

    text = re.sub(r"<script[\s\S]*?</script>|<style[\s\S]*?</style>", " ", html, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()
