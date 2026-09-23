"""Requirements intent analyzer — multimodal input → intent + ODCS contract.

The frontend Requirements Studio posts the full `MultimodalInputState` and
expects `{ analysis, contract }` shaped exactly like its local presets
(`IntentAnalysisResult` / `DataContractSpecification`).

Two engines, one contract:
1. **AI engine (preferred)** — when Ollama is configured and reachable, the
   raw intent text is analyzed by the model (`AI_MODEL`) with a strict JSON
   schema prompt, and the response is merged into the contract scaffold.
2. **Heuristic engine (fallback)** — the deterministic synthesizer below.

`source` on the analysis records which engine produced the result so the UI
and logs can distinguish them. The frontend contract never changes.
"""

from __future__ import annotations

import re
import uuid
from datetime import UTC, datetime

from app.services import ai_client


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_") or "dataset"


_PII_PATTERNS = [
    (
        "email",
        re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.]+\b", re.IGNORECASE),
        "email",
        "high",
        "SHA-256 salted hash",
    ),
    (
        "phone",
        re.compile(r"\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"),
        "phone",
        "high",
        "Cryptographic tokenization",
    ),
    (
        "card",
        re.compile(r"\b(?:\d[ -]?){13,16}\b"),
        "financial",
        "high",
        "Vault tokenization + last-4 display",
    ),
    ("ssn", re.compile(r"\b\d{3}-\d{2}-\d{4}\b"), "ssn", "high", "Vault tokenization"),
]


async def analyze(input_state: dict) -> tuple[dict, dict, str]:
    """Analyze intent → (analysis, contract, source) where source is
    `"ai"` or `"heuristic"`. Never raises for model problems — falls back."""
    if await ai_client.ollama_available():
        try:
            analysis, contract = await _analyze_with_ai(input_state)
            return analysis, contract, "ai"
        except ai_client.AIServiceError:
            pass  # fall through to the deterministic engine
    analysis, contract = _analyze_heuristic(input_state)
    return analysis, contract, "heuristic"


_ANALYSIS_SYSTEM = (
    "You are AIDEN's Requirements Agent. Analyze the user's data-engineering "
    "intent and reply with ONLY a JSON object with exactly these keys: "
    '"topic" (single lowercase word), "pipelinePattern" (one of '
    '"streaming_cdc", "streaming_analytics", "batch_etl", "reverse_etl", '
    '"data_quality_probe", "feature_store_pipeline"), "confidenceScore" '
    '(0-1 float), "executiveSummary" (2 sentences max), "streaming" '
    "(boolean: does this need sub-hour freshness?)."
)


async def _analyze_with_ai(input_state: dict) -> tuple[dict, dict]:
    """Model-backed analysis; raises AIServiceError on any failure."""
    text = _intent_text(input_state)
    data = await ai_client.chat_json(text, system=_ANALYSIS_SYSTEM)

    topic = str(data.get("topic") or ai_client.extract_topic(text))[:40].lower()
    pattern = data.get("pipelinePattern")
    allowed = {
        "streaming_cdc",
        "streaming_analytics",
        "batch_etl",
        "reverse_etl",
        "data_quality_probe",
        "feature_store_pipeline",
    }
    if pattern not in allowed:
        pattern = "streaming_cdc"
    try:
        confidence = min(1.0, max(0.0, float(data.get("confidenceScore", 0.9))))
    except (TypeError, ValueError):
        confidence = 0.9

    # Reuse the deterministic scaffold for PII scanning, columns, rules, and
    # YAML so the AI only shapes intent-level fields — governance stays coded.
    base_analysis, base_contract = _analyze_heuristic(input_state)
    pattern_label = (
        base_analysis["patternLabel"] if base_analysis["pipelinePattern"] == pattern else _label_for(pattern)
    )

    analysis = {
        **base_analysis,
        "intentTitle": f"{topic.capitalize()} {pattern_label} Pipeline",
        "pipelinePattern": pattern,
        "patternLabel": pattern_label,
        "confidenceScore": round(confidence, 2),
        "executiveSummary": str(data.get("executiveSummary") or base_analysis["executiveSummary"])[:400],
    }
    contract = {
        **base_contract,
        "title": f"{topic.capitalize()} Data Contract",
        "description": analysis["executiveSummary"],
    }
    return analysis, contract


def _label_for(pattern: str) -> str:
    return {
        "streaming_cdc": "Streaming CDC Replication",
        "streaming_analytics": "Streaming Analytics",
        "batch_etl": "Scheduled Batch ETL",
        "reverse_etl": "Reverse ETL",
        "data_quality_probe": "Data Quality Probe",
        "feature_store_pipeline": "Feature Store Pipeline",
    }.get(pattern, "Scheduled Batch ETL")


def _intent_text(input_state: dict) -> str:
    mode = input_state.get("activeMode", "text")
    text = ""
    if mode == "sql" or input_state.get("sql", {}).get("sqlQuery"):
        text = input_state.get("sql", {}).get("sqlQuery", "") or ""
    if mode == "audio" or input_state.get("audio", {}).get("transcript"):
        text = input_state.get("audio", {}).get("transcript", "") or text
    if mode == "document" or input_state.get("document", {}).get("fileContent"):
        text = input_state.get("document", {}).get("fileContent", "") or text
    return text or input_state.get("text", {}).get("rawText", "") or "orders pipeline"


def _analyze_heuristic(input_state: dict) -> tuple[dict, dict]:
    mode = input_state.get("activeMode", "text")
    text = ""
    if mode == "sql" or input_state.get("sql", {}).get("sqlQuery"):
        text = input_state.get("sql", {}).get("sqlQuery", "") or ""
    if mode == "audio" or input_state.get("audio", {}).get("transcript"):
        text = input_state.get("audio", {}).get("transcript", "") or text
    if mode == "document" or input_state.get("document", {}).get("fileContent"):
        text = input_state.get("document", {}).get("fileContent", "") or text
    text = text or input_state.get("text", {}).get("rawText", "") or "orders pipeline"

    lower = text.lower()
    words = re.findall(r"[a-z_]{3,}", lower)
    topic = next(
        (
            w
            for w in words
            if w
            in {
                "orders",
                "order",
                "sales",
                "payments",
                "customers",
                "inventory",
                "fraud",
                "clickstream",
                "events",
            }
        ),
        words[0] if words else "orders",
    )
    topic = topic.rstrip("s") or "order"

    streaming = any(
        k in lower
        for k in ("stream", "cdc", "real-time", "realtime", "latency", "fraud", "event", "replicat")
    )
    sql_mode = bool(input_state.get("sql", {}).get("sqlQuery"))

    pattern = "streaming_cdc" if streaming else ("streaming_analytics" if "fraud" in lower else "batch_etl")
    pattern_label = {
        "streaming_cdc": "Streaming CDC Replication",
        "streaming_analytics": "Streaming Analytics",
        "batch_etl": "Scheduled Batch ETL",
        "reverse_etl": "Reverse ETL",
        "data_quality_probe": "Data Quality Probe",
        "feature_store_pipeline": "Feature Store Pipeline",
    }[pattern]

    # PII detection over the provided text
    detected_pii = []
    seen_spans: set[int] = set()
    for pii_type, regex, _, risk, masking in _PII_PATTERNS:
        for match in regex.finditer(text):
            if match.start() in seen_spans:
                continue
            seen_spans.add(match.start())
            col_name = (
                re.sub(r"[^a-z0-9]+", "_", match.group(0).split("@")[0].lower())[:24] or f"{pii_type}_column"
            )
            detected_pii.append(
                {
                    "columnName": col_name,
                    "piiType": pii_type,
                    "riskLevel": risk,
                    "recommendedMasking": masking,
                }
            )
            break  # one sample per type keeps the UI tidy

    sources = input_state.get("sql", {}).get("inferredSources") or ["PostgreSQL OLTP"]
    targets = input_state.get("sql", {}).get("inferredTarget") or "Snowflake Mart"

    sla_tier = "Tier 1 (Mission Critical)" if streaming else "Tier 3 (Analytical)"
    analysis = {
        "intentTitle": (
            "SQL Query to Data Contract"
            if sql_mode and mode == "sql"
            else "Voice Recorded Intent to Pipeline Contract"
            if mode == "audio"
            else f"{topic.capitalize()} {pattern_label} Pipeline"
        ),
        "pipelinePattern": pattern,
        "patternLabel": pattern_label,
        "confidenceScore": 0.94 if len(text.split()) > 20 else 0.88,
        "executiveSummary": (
            f"Synthesized a {pattern_label.lower()} requirement for `{topic}` data with "
            f"{len(detected_pii)} PII field(s) detected; a governed ODCS contract was drafted with "
            f"freshness SLA of {'15 minutes' if streaming else '24 hours'}."
        ),
        "sourceEntities": [
            {"name": s, "type": "source", "technology": "PostgreSQL" if "postgres" in s.lower() else "JDBC"}
            for s in sources[:3]
        ],
        "targetEntities": [
            {
                "name": targets,
                "type": "sink",
                "technology": "Snowflake" if "snow" in targets.lower() else "Warehouse",
            }
        ],
        "detectedPii": detected_pii,
        "suggestedSla": {
            "latency": "≤ 250 ms" if streaming else "≤ 4 h",
            "schedule": "Continuous" if streaming else "Daily 02:00 UTC",
            "slaTier": sla_tier,
            "availability": "99.95%" if streaming else "99.5%",
        },
        "agentSteps": [
            {"agent": "Requirements Agent", "action": f"Parsed {mode} input", "status": "completed"},
            {
                "agent": "Architect Agent",
                "action": f"Selected {pattern_label} pattern",
                "status": "completed",
            },
            {
                "agent": "Governance Agent",
                "action": "Screened PII & masking obligations",
                "status": "completed",
            },
            {"agent": "QA Agent", "action": "Drafted contract assertions", "status": "in_progress"},
        ],
    }

    now_iso = _now_iso()
    contract_id = f"dc-{_slug(topic)}-{uuid.uuid4().hex[:6]}"
    columns = [
        {
            "id": "col-1",
            "name": f"{topic}_id",
            "dataType": "STRING",
            "nullable": False,
            "isPrimaryKey": True,
            "description": f"Primary identifier for {topic}",
            "piiClassification": "Internal",
        },
        {
            "id": "col-2",
            "name": f"{topic}_amount",
            "dataType": "DECIMAL(12,2)",
            "nullable": False,
            "description": "Monetary amount",
            "piiClassification": "Internal",
        },
        {
            "id": "col-3",
            "name": "status",
            "dataType": "STRING",
            "nullable": False,
            "description": "Lifecycle status",
            "piiClassification": "Public",
        },
        {
            "id": "col-4",
            "name": "created_at",
            "dataType": "TIMESTAMP",
            "nullable": False,
            "description": "Event timestamp",
            "piiClassification": "Internal",
        },
    ]
    if detected_pii:
        columns.append(
            {
                "id": "col-5",
                "name": detected_pii[0]["columnName"],
                "dataType": "STRING",
                "nullable": True,
                "description": f"{detected_pii[0]['piiType'].upper()} field detected in source input",
                "piiClassification": "PII",
                "maskingPolicy": detected_pii[0]["recommendedMasking"],
            }
        )

    quality_rules = [
        {
            "id": "qr-1",
            "ruleType": "uniqueness",
            "targetColumn": f"{topic}_id",
            "assertion": f"{topic}_id is unique",
            "severity": "error",
            "threshold": "0 duplicates",
        },
        {
            "id": "qr-2",
            "ruleType": "completeness",
            "targetColumn": f"{topic}_amount",
            "assertion": f"{topic}_amount is not null",
            "severity": "error",
            "threshold": "≥ 99.9%",
        },
        {
            "id": "qr-3",
            "ruleType": "freshness",
            "targetColumn": "created_at",
            "assertion": "freshness within SLA",
            "severity": "warning",
            "threshold": "15 min" if streaming else "24 h",
        },
        {
            "id": "qr-4",
            "ruleType": "range",
            "targetColumn": f"{topic}_amount",
            "assertion": f"{topic}_amount >= 0",
            "severity": "error",
            "threshold": "min 0",
        },
    ]

    contract = {
        "id": contract_id,
        "contractVersion": "1.0.0",
        "title": f"{topic.capitalize()} Data Contract",
        "status": "draft",
        "createdAt": now_iso,
        "updatedAt": now_iso,
        "datasetName": f"{_slug(topic)}_contracted",
        "physicalTarget": "snowflake" if "snow" in targets.lower() else "warehouse",
        "targetFormat": "Snowflake Table",
        "description": analysis["executiveSummary"],
        "columns": columns,
        "qualityRules": quality_rules,
        "sla": {
            "freshness": "15 minutes" if streaming else "24 hours",
            "availability": "99.95%" if streaming else "99.5%",
            "maxLatency": "≤ 250 ms" if streaming else "≤ 4 h",
            "updateFrequency": "Continuous" if streaming else "Daily",
            "retentionPeriod": "7 years",
            "checkpointInterval": "30 s" if streaming else "1 h",
        },
        "governance": {
            "dataDomain": f"{topic.capitalize()}",
            "dataOwner": "Data Platform Team",
            "technicalOwner": "AIDEN Platform",
            "securityClassification": "Confidential" if detected_pii else "Internal",
            "complianceTags": ["GDPR"] if detected_pii else [],
            "downstreamConsumers": ["Finance Close", "Exec Sales"],
        },
        "rawYaml": (
            f"dataset: {_slug(topic)}_contracted\n"
            f"version: 1.0.0\n"
            f"columns:\n"
            + "".join(f"  - name: {c['name']}\n    type: {c['dataType']}\n" for c in columns)
            + f"sla:\n  freshness: {'15 minutes' if streaming else '24 hours'}\n"
            f"  availability: {'99.95%' if streaming else '99.5%'}\n"
        ),
    }
    return analysis, contract
