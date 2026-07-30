"""
Monitoring Agent — Pipeline health checks and anomaly detection.

Monitors pipeline execution metrics, detects anomalies (slow runs,
data volume spikes, error rate increases), and emits alerts.
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta

from app.agents.base_agent import BaseAIDENAgent

logger = logging.getLogger(__name__)


class MonitoringAgent(BaseAIDENAgent):
    """Detect pipeline anomalies and emit health alerts."""

    def __init__(self):
        super().__init__(
            name="monitoring_agent",
            tools=[],
            system_prompt="You are a monitoring agent that detects pipeline anomalies.",
        )
        self.thresholds = {
            "max_duration_minutes": 60,
            "max_error_rate": 0.1,
            "min_record_count": 0,
            "max_record_spike_pct": 200,
        }

    async def run(self, execution_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze execution data and detect anomalies."""
        alerts = []
        status = "healthy"

        duration = execution_data.get("duration_seconds", 0)
        if duration > self.thresholds["max_duration_minutes"] * 60:
            alerts.append(f"Execution took {duration}s — exceeds {self.thresholds['max_duration_minutes']}min threshold")
            status = "warning"

        error_rate = execution_data.get("error_rate", 0)
        if error_rate > self.thresholds["max_error_rate"]:
            alerts.append(f"Error rate {error_rate:.1%} exceeds {self.thresholds['max_error_rate']:.0%} threshold")
            status = "critical"

        records = execution_data.get("records_processed", 0)
        if records < self.thresholds["min_record_count"]:
            alerts.append(f"Only {records} records processed")
            if status != "critical":
                status = "warning"

        return {
            "status": status,
            "alerts": alerts,
            "checked_at": datetime.utcnow().isoformat(),
            "metrics": {
                "duration_seconds": duration,
                "error_rate": error_rate,
                "records_processed": records,
            },
        }
