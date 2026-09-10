"""AIDEN DocumentProcessor — chunk documents into embedding-ready pieces.

Uses a lightweight built-in chunker (paragraph → sentence packing) so no
heavy dependency is required. If langchain is installed it is used instead
for better semantic splitting.
"""
import logging
import re
from typing import List, Optional

logger = logging.getLogger(__name__)

try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    LANGCHAIN_AVAILABLE = True
except ImportError:
    try:
        from langchain.text_splitter import RecursiveCharacterTextSplitter
        LANGCHAIN_AVAILABLE = True
    except ImportError:
        LANGCHAIN_AVAILABLE = False

CHUNK_SIZE = 500
CHUNK_OVERLAP = 50


class DocumentProcessor:
    """Chunk + normalize documents before embedding."""

    def __init__(self, chunk_size: int = CHUNK_SIZE, chunk_overlap: int = CHUNK_OVERLAP):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self._splitter = None
        if LANGCHAIN_AVAILABLE:
            try:
                self._splitter = RecursiveCharacterTextSplitter(
                    chunk_size=chunk_size,
                    chunk_overlap=chunk_overlap,
                    separators=["\n\n", "\n", ". ", " ", ""],
                )
            except Exception as e:
                logger.debug(f"langchain splitter unavailable: {e}")

    def chunk_document(self, text: str) -> List[str]:
        """Split text into overlapping chunks."""
        if not text or not text.strip():
            return []
        if self._splitter:
            try:
                return [c for c in self._splitter.split_text(text) if c.strip()]
            except Exception:
                pass
        return self._fallback_chunk(text)

    def _fallback_chunk(self, text: str) -> List[str]:
        """Paragraph → sentence packing without external deps."""
        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
        chunks: List[str] = []
        current = ""
        for para in paragraphs:
            # Hard-split oversized paragraphs on sentence boundaries
            while len(para) > self.chunk_size:
                cut = para.rfind(". ", 0, self.chunk_size)
                cut = cut + 1 if cut > 0 else self.chunk_size
                piece, para = para[:cut].strip(), para[cut:].strip()
                if piece:
                    self._flush(chunks, current + " " + piece)
                    current = ""
            if len(current) + len(para) + 1 <= self.chunk_size:
                current = f"{current} {para}".strip()
            else:
                self._flush(chunks, current)
                current = para
        self._flush(chunks, current)
        return chunks

    def _flush(self, chunks: List[str], chunk: str):
        if chunk and chunk.strip():
            chunks.append(chunk.strip())

    @staticmethod
    def normalize(text: str) -> str:
        """Collapse whitespace and strip control characters."""
        return re.sub(r"\s+", " ", text or "").strip()

    def ingest_document(
        self,
        content: str,
        project_id: Optional[int] = None,
        source_type: str = "doc",
        source_ref: Optional[str] = None,
        meta: Optional[dict] = None,
    ) -> dict:
        """Chunk + embed + store a document. Returns an ingest summary."""
        clean = self.normalize(content)
        chunks = self.chunk_document(clean)
        stored = 0
        from app.rag.vector_store import VectorStore
        store = VectorStore()
        for i, chunk in enumerate(chunks):
            try:
                import asyncio
                result = asyncio.get_event_loop().run_until_complete(
                    store.upsert(
                        content=chunk,
                        project_id=project_id,
                        source_type=source_type,
                        source_ref=source_ref,
                        meta={**(meta or {}), "chunk_index": i},
                    )
                )
                stored += 1
            except Exception as e:
                logger.warning(f"Chunk {i} ingest failed: {e}")
        return {"chunks": len(chunks), "stored": stored, "source_ref": source_ref}
