"""
Generate synthetic intent-parsing examples for fine-tuning.

Uses OpenAI or any OpenAI-compatible API (e.g. Ollama, vLLM) to
produce realistic ``{"instruction": "...", "output": "..."}`` pairs.

Usage:
    # Use OpenAI (export OPENAI_API_KEY first)
    python scripts/generate_synthetic_data.py --num 100 --output data/custom_dataset.jsonl

    # Use a local Ollama model
    python scripts/generate_synthetic_data.py --num 50 --api-base http://localhost:11434/v1 --model llama3
"""

import argparse
import json
import logging
import os
import sys
from typing import List, Optional

logger = logging.getLogger(__name__)

# ── Prompt template for the LLM ──────────────────────────────────────────

SEED_EXAMPLES = [
    {
        "instruction": "Build a daily sales pipeline from PostgreSQL to Snowflake",
        "output": '{"name":"Daily Sales ETL","source_type":"postgres","source_config":{"table":"sales"},"destination_type":"snowflake","destination_config":{"schema":"analytics"},"transformations":["clean","aggregate_by_region"],"schedule":"0 6 * * *","data_quality_rules":["no_null_primary_key","amount_positive"]}',
    },
    {
        "instruction": "Create an hourly customer analytics pipeline from MySQL to BigQuery",
        "output": '{"name":"Customer Analytics","source_type":"mysql","source_config":{"table":"customers"},"destination_type":"bigquery","destination_config":{"dataset":"analytics"},"transformations":["clean","enrich_customer_data"],"schedule":"0 * * * *","data_quality_rules":["no_duplicate_emails","email_format_valid"]}',
    },
    {
        "instruction": "Build a real-time IoT data pipeline from Kafka to S3",
        "output": '{"name":"IoT Stream Pipeline","source_type":"kafka","source_config":{"topic":"iot_sensors"},"destination_type":"s3","destination_config":{"bucket":"iot-data","format":"parquet"},"transformations":["filter_invalid_readings","aggregate_by_device"],"schedule":"* * * * *","data_quality_rules":["no_null_timestamps","device_id_exists"]}',
    },
]

SYSTEM_PROMPT = """You are a data pipeline expert. Generate realistic data pipeline requests and their structured JSON intent.

Each example must be valid JSON with two keys:
- "instruction": A natural language request for a data pipeline
- "output": A JSON string with pipeline metadata:
    name, source_type, source_config, destination_type, destination_config,
    transformations, schedule (cron), data_quality_rules

Cover diverse sources (PostgreSQL, MySQL, Kafka, S3, BigQuery, Snowflake,
Elasticsearch, MongoDB, Redis, Salesforce, APIs, etc.) and diverse purposes
(ETL, streaming, CDC, analytics, ML feature engineering, compliance, etc.).

Return ONLY a JSON array of objects. No markdown, no code fences."""


def generate_examples(
    num_examples: int = 20,
    model: str = "gpt-4o-mini",
    api_base: Optional[str] = None,
    api_key: Optional[str] = None,
) -> List[dict]:
    """Generate *num_examples* intent-parsing examples using an LLM.

    Requires the ``openai`` package (``pip install openai``).

    Args:
        num_examples: How many examples to generate.
        model: Model name (e.g. ``"gpt-4o-mini"``, ``"llama3"``).
        api_base: Custom API base URL (for Ollama / vLLM).
        api_key: API key.  Falls back to ``OPENAI_API_KEY`` env var.

    Returns:
        List of ``{"instruction": ..., "output": ...}`` dicts.
    """
    try:
        from openai import OpenAI
    except ImportError:
        print("❌ openai package not installed.  Run:  pip install openai")
        sys.exit(1)

    client = OpenAI(
        api_key=api_key or os.getenv("OPENAI_API_KEY"),
        base_url=api_base,
    )

    seed_json = json.dumps(SEED_EXAMPLES, indent=2)

    user_prompt = f"""Generate exactly {num_examples} diverse data pipeline intent examples.
Follow the exact same JSON format as these seed examples:

{seed_json}

Make sure:
- Each instruction is a different, realistic request
- Cover at least 10 different source types
- Include edge cases (very short, very complex, unusual source/dest pairs)
- All output JSON strings are valid JSON
- The schedule field uses valid cron expressions
- Return ONLY a JSON array, nothing else"""

    print(f"🤖 Generating {num_examples} examples with {model}...")
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.8,
        max_tokens=4000,
    )

    content = response.choices[0].message.content
    if not content:
        print("❌ Empty response from model")
        return []

    # Strip markdown code fences if present
    if "```" in content:
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
        content = content.strip()

    try:
        examples = json.loads(content)
        if not isinstance(examples, list):
            examples = [examples]
    except json.JSONDecodeError as exc:
        print(f"❌ Failed to parse model output as JSON: {exc}")
        print(f"Raw output:\n{content[:500]}")
        return []

    # Validate each example
    valid = []
    for ex in examples:
        if "instruction" in ex and "output" in ex:
            try:
                json.loads(ex["output"])  # ensure output is valid JSON
                valid.append(ex)
            except (json.JSONDecodeError, TypeError):
                logger.warning("Skipping example with invalid output JSON: %s", ex.get("instruction", "")[:60])

    print(f"✅ Generated {len(valid)} valid examples out of {len(examples)}")
    return valid


def save_dataset(examples: List[dict], output_path: str):
    """Save examples as a JSONL file (one JSON object per line)."""
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        for ex in examples:
            f.write(json.dumps(ex, ensure_ascii=False) + "\n")
    print(f"💾 Saved {len(examples)} examples to {output_path}")


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate synthetic intent-parsing dataset")
    parser.add_argument("--num", type=int, default=20, help="Number of examples to generate")
    parser.add_argument("--output", default="data/intent_dataset.jsonl", help="Output JSONL path")
    parser.add_argument("--model", default="gpt-4o-mini", help="Model name")
    parser.add_argument("--api-base", default=None, help="Custom API base URL (for Ollama)")
    parser.add_argument("--api-key", default=None, help="API key (default: OPENAI_API_KEY env)")
    return parser.parse_args(argv)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    args = parse_args()
    examples = generate_examples(
        num_examples=args.num,
        model=args.model,
        api_base=args.api_base,
        api_key=args.api_key,
    )
    if examples:
        save_dataset(examples, args.output)
    else:
        print("❌ No examples generated")
        sys.exit(1)
