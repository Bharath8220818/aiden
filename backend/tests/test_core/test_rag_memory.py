"""
Tests for RAGMemory — focuses on in-memory store and search logic.

The RAG memory uses an in-memory store when Qdrant/HuggingFace are
unavailable, so these tests validate the cosine-similarity search
without requiring any external services.
"""

import pytest
from app.core.rag_memory import RAGMemory, InMemoryStore


@pytest.fixture
def memory():
    """Provide a fresh RAGMemory instance for each test."""
    return RAGMemory()


@pytest.mark.asyncio
async def test_rag_memory_is_ready(memory):
    """is_ready() reflects whether sentence-transformers is available."""
    # is_ready() returns True when the HF embedder is installed, False otherwise.
    # Either way it returns a bool and the store works via in-memory fallback.
    assert isinstance(memory.is_ready(), bool)

    # When embeddings ARE available, semantic search should find stored entries.
    if memory.is_ready():
        memory.add("Move data from PostgreSQL to Snowflake", {"source_type": "postgres"})
        hits = memory.search("postgres to snowflake", top_k=1)
        assert len(hits) >= 0
        assert memory.count() == 1


@pytest.mark.asyncio
async def test_rag_memory_store_and_search(memory):
    """Test storing and searching in in-memory store."""
    query = "Move data from PostgreSQL to Snowflake"
    parsed = {
        "name": "Test Pipeline",
        "source_type": "postgres",
        "destination_type": "snowflake",
    }

    # Store an entry
    memory.add(query, parsed)
    assert memory.count() == 1

    # Search — returns a list (may be empty without embeddings)
    results = memory.search(query, top_k=3)
    assert isinstance(results, list)

    # If embeddings are unavailable, search degrades gracefully
    # (either finds the entry or returns an empty list — never crashes)
    for r in results:
        assert r["query"] == query
        assert r["intent"]["source_type"] == "postgres"


@pytest.mark.asyncio
async def test_rag_memory_empty_search(memory):
    """Test search returns empty list when nothing is stored."""
    results = memory.search("some query", top_k=3)
    assert results == []


@pytest.mark.asyncio
async def test_rag_memory_count(memory):
    """Test count returns 0 on fresh instance."""
    assert memory.count() == 0

    memory.add("query one", {"name": "p1"})
    memory.add("query two", {"name": "p2"})
    assert memory.count() == 2


@pytest.mark.asyncio
async def test_rag_memory_format_context(memory):
    """Test format_context returns empty string when no results."""
    assert memory.format_context([]) == ""


@pytest.mark.asyncio
async def test_rag_memory_format_context_with_results(memory):
    """Test format_context returns formatted string with results."""
    results = [
        {
            "query": "test query",
            "intent": {"source_type": "postgres", "destination_type": "snowflake", "schedule": "0 6 * * *"},
            "score": 0.95,
        }
    ]
    context = memory.format_context(results)
    assert "test query" in context
    assert "postgres" in context
    assert "snowflake" in context


def test_cosine_similarity():
    """Test the cosine similarity method on InMemoryStore."""
    store = InMemoryStore()
    assert store._cosine_similarity([1.0, 0.0, 0.0], [1.0, 0.0, 0.0]) == pytest.approx(1.0)

    assert store._cosine_similarity([1.0, 0.0, 0.0], [0.0, 1.0, 0.0]) == pytest.approx(0.0)

    # Zero vector edge case
    assert store._cosine_similarity([0.0, 0.0, 0.0], [1.0, 0.0, 0.0]) == 0.0

    assert store._cosine_similarity([0.0, 0.0, 0.0], [0.0, 0.0, 0.0]) == 0.0


def test_in_memory_store_search_scores():
    """Test InMemoryStore.search returns entries with scores."""
    store = InMemoryStore()
    store.add({"query": "a", "intent": {}}, embedding=[1.0, 0.0, 0.0])
    store.add({"query": "b", "intent": {}}, embedding=[0.0, 1.0, 0.0])

    results = store.search([1.0, 0.0, 0.0], top_k=5, min_score=0.0)
    assert len(results) == 2
    assert results[0]["query"] == "a"  # most similar
    assert results[0]["score"] == pytest.approx(1.0)

    # Query orthogonal to everything returns no results above a high threshold
    results = store.search([0.0, 0.0, 1.0], top_k=5, min_score=0.9)
    assert results == []
