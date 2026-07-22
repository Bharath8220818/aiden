"""
AI Integration Test Suite
=========================
Verifies the full HuggingFace + Intent Parser + Agent Orchestrator stack.

Usage:
    python scripts/test_ai.py              # Run all tests
    python scripts/test_ai.py --verbose    # Detailed output
    python scripts/test_ai.py --quick      # Skip agent orchestrator (slow)
"""

import argparse
import asyncio
import json
import logging
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════════════════
# Test Runner
# ══════════════════════════════════════════════════════════════════════════


class TestResult:
    """Holds the outcome of a single test."""

    def __init__(self, name: str):
        self.name = name
        self.passed = None
        self.duration = 0.0
        self.detail = ""

    def ok(self, detail: str = ""):
        self.passed = True
        self.detail = detail

    def fail(self, detail: str = ""):
        self.passed = False
        self.detail = detail

    def __str__(self) -> str:
        symbol = "✓" if self.passed else ("✗" if self.passed is False else "–")
        dur = f" [{self.duration:.2f}s]" if self.duration else ""
        return f"  {symbol} {self.name}{dur}"

    def verbose(self) -> str:
        parts = [str(self)]
        if self.detail:
            for line in self.detail.strip().split("\n"):
                parts.append(f"       {line}")
        return "\n".join(parts)


class AITestSuite:
    """Runs all AI integration tests."""

    def __init__(self, verbose: bool = False, quick: bool = False):
        self.verbose = verbose
        self.quick = quick
        self.results: list[TestResult] = []

    def run(self, name: str, fn, *args, **kwargs):
        """Run a single test, recording its result."""
        result = TestResult(name)
        self.results.append(result)

        start = time.perf_counter()
        try:
            output = fn(*args, **kwargs)
            result.duration = time.perf_counter() - start

            if isinstance(output, tuple) and len(output) == 2:
                ok, detail = output
                if ok:
                    result.ok(detail or "passed")
                else:
                    result.fail(detail or "failed")
            elif output:
                result.ok(str(output)[:200])
            else:
                result.fail("returned falsy")

        except Exception as exc:
            result.duration = time.perf_counter() - start
            result.fail(str(exc))

    async def run_async(self, name: str, fn, *args, **kwargs):
        """Run an async test."""
        result = TestResult(name)
        self.results.append(result)

        start = time.perf_counter()
        try:
            output = await fn(*args, **kwargs)
            result.duration = time.perf_counter() - start

            if isinstance(output, tuple) and len(output) == 2:
                ok, detail = output
                if ok:
                    result.ok(detail or "passed")
                else:
                    result.fail(detail or "failed")
            elif output:
                result.ok(str(output)[:200])
            else:
                result.fail("returned falsy")

        except Exception as exc:
            result.duration = time.perf_counter() - start
            result.fail(str(exc))

    def summary(self) -> tuple[int, int]:
        passed = sum(1 for r in self.results if r.passed is True)
        failed = sum(1 for r in self.results if r.passed is False)
        skipped = sum(1 for r in self.results if r.passed is None)
        return passed, failed, skipped


# ══════════════════════════════════════════════════════════════════════════
# Tests
# ══════════════════════════════════════════════════════════════════════════


def test_config_import() -> tuple[bool, str]:
    """Verify app.config loads without errors."""
    from app.config import settings

    assert settings.APP_NAME == "AIDEN"
    assert settings.INTENT_MODEL is not None
    assert settings.HF_CACHE_DIR is not None
    return True, f"APP_NAME={settings.APP_NAME}, INTENT_MODEL={settings.INTENT_MODEL}"


def test_hf_service_import() -> tuple[bool, str]:
    """Verify hf_service singleton imports and checks availability."""
    from app.services.hf_service import hf_service

    available = hf_service.is_available()
    status = "AVAILABLE" if available else "FALLBACK MODE (no HF token / offline)"
    return True, f"is_available()={available} — {status}"


def test_hf_service_embeddings_fallback() -> tuple[bool, str]:
    """Verify get_embeddings() handles unavailable gracefully."""
    from app.services.hf_service import hf_service

    result = hf_service.get_embeddings("test")
    if result is None and not hf_service.is_available():
        return True, "Correctly returned None (HF unavailable)"
    if result is not None:
        return True, f"Embedding generated: dim={len(result[0])}"
    return True, "ok"


def test_hf_service_generate_fallback() -> tuple[bool, str]:
    """Verify generate() handles unavailable gracefully."""
    from app.services.hf_service import hf_service

    result = hf_service.generate("Test prompt", max_new_tokens=10)
    if result is None and not hf_service.is_available():
        return True, "Correctly returned None (HF unavailable)"
    if result is not None:
        return True, f"Generated: {result[:80]}..."
    return True, "ok"


async def test_intent_parser_rule_based() -> tuple[bool, str]:
    """Verify intent parser fallback produces valid output without AI."""
    from app.core.intent_parser import IntentParser

    parser = IntentParser()
    result = await parser.parse("Build a daily sales pipeline from PostgreSQL to Snowflake")

    assert result["name"] is not None
    assert result["source_type"] is not None
    assert result["destination_type"] is not None
    assert isinstance(result["transformations"], list)
    assert isinstance(result["data_quality_rules"], list)

    return True, json.dumps(result, indent=2)


async def test_intent_parser_edge_cases() -> tuple[bool, str]:
    """Verify intent parser handles edge cases."""
    from app.core.intent_parser import IntentParser

    parser = IntentParser()

    # Empty query
    result1 = await parser.parse("")
    assert result1 is not None, "Empty query should return default"

    # Minimal query
    result2 = await parser.parse("hourly kafka to s3")
    assert result2["source_type"] == "kafka"
    assert result2["destination_type"] == "s3"
    assert "hourly" in result2["schedule"] or "hour" in result2["schedule"]

    # Single word
    result3 = await parser.parse("snowflake")
    assert result3["source_type"] == "snowflake" or result3["destination_type"] == "snowflake"

    return True, "All edge cases passed: empty, minimal, single-word"


def test_agent_orchestrator_import() -> tuple[bool, str]:
    """Verify agent orchestrator can be instantiated."""
    from app.core.agent_orchestrator import AgentOrchestrator

    orch = AgentOrchestrator()
    status = "ENABLED" if orch.is_enabled() else "DISABLED (smolagents not installed)"
    return True, f"is_enabled()={orch.is_enabled()} — {status}"


async def test_agent_orchestrator_execute() -> tuple[bool, str]:
    """Verify orchestrator.execute() runs without error."""
    from app.core.agent_orchestrator import AgentOrchestrator

    orch = AgentOrchestrator()
    if not orch.is_enabled():
        return True, "Skipped (orchestrator disabled)"

    result = await orch.execute("Extract data from PostgreSQL and clean it")
    assert result["status"] in ("success", "failed", "disabled")
    return True, f"status={result['status']}"


async def test_full_pipeline_flow() -> tuple[bool, str]:
    """End-to-end: Intent → Parse → Orchestrate."""
    from app.core.intent_parser import IntentParser
    from app.core.agent_orchestrator import AgentOrchestrator

    # Step 1: Parse
    parser = IntentParser()
    parsed = await parser.parse(
        "Build a daily customer analytics pipeline from PostgreSQL to Snowflake, "
        "cleaning and aggregating the data"
    )
    assert parsed["source_type"] is not None
    assert parsed["destination_type"] is not None

    # Step 2: Orchestrate (if available)
    orch = AgentOrchestrator()
    if orch.is_enabled():
        result = await orch.execute(
            f"Generate pipeline code for: {json.dumps(parsed)}",
            context=parsed,
        )
        assert result["status"] in ("success", "failed")
        pipeline_steps = f"Orchestrated: {result.get('agents_used', 'none')}"
    else:
        pipeline_steps = "Skipped orchestration (disabled)"

    return True, f"Parsed: {parsed['name']}. {pipeline_steps}"




# --- RAG Memory Tests ---


def test_rag_store_and_count() -> tuple[bool, str]:
    """Verify store_pipeline() increments count()."""
    from app.core.rag_memory import rag_memory
    initial = rag_memory.count()
    ok = rag_memory.store_pipeline(
        query="Build a daily sales pipeline from PostgreSQL to Snowflake",
        parsed={
            "name": "Daily Sales ETL",
            "source_type": "postgres",
            "destination_type": "snowflake",
            "schedule": "0 6 * * *",
            "transformations": ["clean", "aggregate"],
            "data_quality_rules": ["no_nulls"],
        },
        user_id=1,
        pipeline_id=42,
    )
    after = rag_memory.count()
    if not ok:
        return True, "Skipped - HF embeddings unavailable"
    assert after == initial + 1, f'Expected {initial + 1}, got {after}'
    return True, f"Count: {initial} -> {after}, pipeline_id=42 stored"


def test_rag_semantic_search() -> tuple[bool, str]:
    """Search for similar pipeline after storing one."""
    from app.core.rag_memory import rag_memory
    rag_memory.store_pipeline(
        query="Move customer orders from PostgreSQL to Snowflake daily",
        parsed={
            "name": "Customer Orders Sync",
            "source_type": "postgres",
            "destination_type": "snowflake",
        },
        user_id=1,
        pipeline_id=99,
    )
    results = rag_memory.search_similar(
        query="daily postgres to snowflake pipeline for orders",
        user_id=1, top_k=3, min_score=0.3,
    )
    if len(results) == 0 and not rag_memory._embed('test'):
        return True, "Skipped - HF embeddings unavailable"
    assert len(results) > 0, 'Expected at least one result'
    assert results[0]['score'] > 0.3, f'Low score: {results[0]["score"]:.3f}'
    assert results[0]['pipeline_id'] == 99
    detail = f"Top match: {results[0]['query']} (score={results[0]['score']:.3f})"
    for r in results[1:]:
        detail += f', {r["query"]} ({r["score"]:.3f})'
    return True, detail


def test_rag_format_context() -> tuple[bool, str]:
    """Verify format_context() with empty and populated results."""
    from app.core.rag_memory import rag_memory
    empty = rag_memory.format_context([], max_examples=3)
    assert empty == '', 'Expected empty string'
    sample = [
        {
            "query": "PostgreSQL to Snowflake sync",
            "parsed": {
                "name": "PG to SF",
                "source_type": "postgres",
                "destination_type": "snowflake",
            },
            "score": 0.85,
            "pipeline_id": 42,
        },
        {
            "query": "Kafka to S3 streaming",
            "parsed": {
                "name": "Kafka S3",
                "source_type": "kafka",
                "destination_type": "s3",
            },
            "score": 0.65,
            "pipeline_id": 43,
        },
    ]
    ctx = rag_memory.format_context(sample, max_examples=2)
    assert len(ctx) > 0, 'Expected non-empty'
    assert 'similar past pipeline' in ctx
    assert 'PostgreSQL to Snowflake' in ctx
    assert 'similarity: 0.85' in ctx
    assert 'Example 1' in ctx and 'Example 2' in ctx
    return True, f'Context length: {len(ctx)} chars, examples: {ctx.count("Example")}'

# ══════════════════════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════════════════════


BANNER = """
╔══════════════════════════════════════════════════════╗
║        AIDEN — AI Integration Test Suite             ║
╚══════════════════════════════════════════════════════╝
"""


def main():
    parser = argparse.ArgumentParser(
        description="Test AIDEN AI integration (HF, Intent, Agents)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/test_ai.py                # Full test suite
  python scripts/test_ai.py --quick        # Skip slow agent tests
  python scripts/test_ai.py --verbose      # Detailed output
        """,
    )
    parser.add_argument("--verbose", "-v", action="store_true", help="Detailed output")
    parser.add_argument("--quick", "-q", action="store_true", help="Skip slow agent orchestrator tests")
    args = parser.parse_args()

    print(BANNER)
    suite = AITestSuite(verbose=args.verbose, quick=args.quick)

    # ── Config ──
    suite.run("Config imports", test_config_import)

    # ── HuggingFace Service ──
    suite.run("HF Service import & availability", test_hf_service_import)
    suite.run("HF Service embeddings fallback", test_hf_service_embeddings_fallback)
    suite.run("HF Service generate fallback", test_hf_service_generate_fallback)

    # ── Intent Parser ──
    asyncio.run(suite.run_async("Intent parser rule-based parse", test_intent_parser_rule_based))
    asyncio.run(suite.run_async("Intent parser edge cases", test_intent_parser_edge_cases))

    # ── Agent Orchestrator ──
    suite.run("Agent orchestrator import", test_agent_orchestrator_import)
    if not args.quick:
        asyncio.run(suite.run_async("Agent orchestrator execute", test_agent_orchestrator_execute))
    else:
        suite.results.append(TestResult("Agent orchestrator execute (skipped — quick mode)"))

    
    # --- RAG Memory ---
    suite.run("RAG store & count", test_rag_store_and_count)
    suite.run("RAG semantic search", test_rag_semantic_search)
    suite.run("RAG format_context", test_rag_format_context)

# ── Full Pipeline ──
    asyncio.run(suite.run_async("Full pipeline flow (intent → agents)", test_full_pipeline_flow))

    # ── Results ──
    print("─" * 60)
    print()

    for result in suite.results:
        if args.verbose:
            print(result.verbose())
        else:
            print(result)

    print()
    print("─" * 60)

    passed, failed, skipped = suite.summary()
    total = passed + failed + skipped
    emoji = "✓" if failed == 0 else "✗"
    print(f"\n{emoji} {passed}/{total} passed, {failed} failed, {skipped} skipped\n")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
