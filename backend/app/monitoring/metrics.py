"""AIDEN Prometheus metrics — Stage 3 observability.

Exposes counters/histograms for pipeline runs, agent calls, tool executions,
and LLM token/cost usage. When ``prometheus_client`` is not installed the
module transparently falls back to thread-safe in-memory counters with the
same call signature, so imports never fail and the app keeps running.
"""
import logging
import threading
from typing import Dict

logger = logging.getLogger(__name__)

try:
    from prometheus_client import Counter, Histogram, Gauge
    PROMETHEUS_AVAILABLE = True
except ImportError:
    PROMETHEUS_AVAILABLE = False
    logger.info("prometheus_client not installed — using in-memory metrics fallback")


# ─── In-memory fallback ────────────────────────────────────────────────
class _FallbackMetric:
    """Minimal stand-in for prometheus_client metrics (same call surface)."""

    def __init__(self, name: str, doc: str, labelnames: tuple = ()):
        self.name = name
        self.doc = doc
        self.labelnames = labelnames
        self._lock = threading.Lock()
        self._values: Dict[tuple, float] = {}

    def labels(self, **labels):
        key = tuple(labels.get(ln, "") for ln in self.labelnames)
        return _FallbackChild(self, key)

    def inc(self, amount: float = 1.0):
        with self._lock:
            self._values[()] = self._values.get((), 0.0) + amount

    def observe(self, amount: float):
        with self._lock:
            self._values[("_count",)] = self._values.get(("_count",), 0.0) + 1
            self._values[("_sum",)] = self._values.get(("_sum",), 0.0) + amount

    def set(self, value: float):
        with self._lock:
            self._values[()] = value

    def collect(self):
        rows = []
        for key, value in list(self._values.items()):
            rows.append((key, value))
        return rows


class _FallbackChild:
    def __init__(self, metric: _FallbackMetric, key: tuple):
        self._metric = metric
        self._key = key

    def inc(self, amount: float = 1.0):
        with self._metric._lock:
            vals = self._metric._values
            vals[self._key] = vals.get(self._key, 0.0) + amount

    def observe(self, amount: float):
        self.inc(amount)

    def set(self, value: float):
        with self._metric._lock:
            self._metric._values[self._key] = value


class _FallbackGauge(_FallbackMetric):
    pass


# ─── Metric definitions ────────────────────────────────────────────────
if PROMETHEUS_AVAILABLE:
    pipeline_runs = Counter(
        "aiden_pipeline_runs_total", "Total pipeline runs", ["pipeline", "status"]
    )
    pipeline_duration = Histogram(
        "aiden_pipeline_duration_seconds", "Pipeline duration", ["pipeline"]
    )
    agent_calls = Counter(
        "aiden_agent_calls_total", "Agent calls", ["agent", "status"]
    )
    tool_calls = Counter(
        "aiden_tool_calls_total", "Tool/connector executions", ["tool", "status"]
    )
    llm_tokens = Counter("aiden_llm_tokens_total", "LLM tokens used", ["model"])
    llm_cost = Counter("aiden_llm_cost_total", "LLM cost (USD)", ["model"])
    active_agents = Gauge("aiden_active_agents", "Number of active agents")
else:
    pipeline_runs = _FallbackMetric("aiden_pipeline_runs_total", "", ("pipeline", "status"))
    pipeline_duration = _FallbackMetric("aiden_pipeline_duration_seconds", "", ("pipeline",))
    agent_calls = _FallbackMetric("aiden_agent_calls_total", "", ("agent", "status"))
    tool_calls = _FallbackMetric("aiden_tool_calls_total", "", ("tool", "status"))
    llm_tokens = _FallbackMetric("aiden_llm_tokens_total", "", ("model",))
    llm_cost = _FallbackMetric("aiden_llm_cost_total", "", ("model",))
    active_agents = _FallbackGauge("aiden_active_agents", "")


def metrics_text() -> str:
    """Render metrics in Prometheus text exposition format.

    Real output when prometheus_client is installed; a simple readable
    rendering of the in-memory fallback otherwise.
    """
    if PROMETHEUS_AVAILABLE:
        from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
        return generate_latest().decode("utf-8")

    lines: list[str] = []
    for metric in (pipeline_runs, pipeline_duration, agent_calls, tool_calls, llm_tokens, llm_cost):
        lines.append(f"# TYPE {metric.name} counter")
        for key, value in metric.collect():
            if key and not key[0].startswith("_"):
                labels = ",".join(
                    f'{ln}="{v}"' for ln, v in zip(metric.labelnames, key)
                )
                lines.append(f"{metric.name}{{{labels}}} {value}")
    lines.append("# TYPE aiden_active_agents gauge")
    for key, value in active_agents.collect():
        lines.append(f"aiden_active_agents {value}")
    return "\n".join(lines) + "\n"
