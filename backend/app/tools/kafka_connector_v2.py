"""
Kafka Connector v2 — Enhanced with Pydantic validation, retries, timeouts, and audit logging.

Wraps Kafka admin operations via the Tool Gateway with full operational support.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

from pydantic import BaseModel, Field

from app.tools.connector_base_v2 import (
    BaseConnector,
    ToolCategory,
    ToolStatus,
    ConnectorResult,
    ConnectorHealth,
    classify_mutation,
)

logger = logging.getLogger(__name__)


# ── Pydantic Input Schemas ──────────────────────────────────────────

class KafkaCreateTopicParams(BaseModel):
    topic: str = Field(..., min_length=1, description="Topic name to create")
    partitions: int = Field(3, ge=1, le=1000, description="Number of partitions")
    replication_factor: int = Field(1, ge=1, le=10, description="Replication factor")
    retention_ms: Optional[int] = Field(None, description="Retention period in ms")


class KafkaDeleteTopicParams(BaseModel):
    topic: str = Field(..., min_length=1, description="Topic name to delete")


class KafkaConsumerLagParams(BaseModel):
    topic: str = Field(..., description="Topic name")
    group_id: Optional[str] = Field(None, description="Consumer group ID")


# ── Connector ───────────────────────────────────────────────────────

class KafkaConnectorV2(BaseConnector):
    """Enhanced Apache Kafka connector with retries, validation, and audit logging."""

    name = "kafka"
    display_name = "Apache Kafka"
    category = ToolCategory.STREAM_PROCESSOR
    icon = "kafka"
    description = "Stream and process real-time data events with Apache Kafka"

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        cfg = config or {}
        self._bootstrap_servers: str = cfg.get("bootstrap_servers", "localhost:9092")
        self._admin = None
        self._capabilities = [
            "list_topics",
            "create_topic",
            "delete_topic",
            "get_topic_info",
            "get_consumer_lag",
            "describe_topic",
            "produce",
            "consume",
            "get_broker_metadata",
        ]

    def _get_admin(self):
        if self._admin is None:
            try:
                from confluent_kafka.admin import AdminClient
                self._admin = AdminClient({"bootstrap.servers": self._bootstrap_servers})
            except ImportError:
                logger.warning("confluent-kafka not installed; Kafka connector will return mock data")
        return self._admin

    # ── Public interface ────────────────────────────────────────────

    async def test(self) -> ConnectorResult:
        start = datetime.utcnow()
        action = "test"
        admin = self._get_admin()
        if not admin:
            self._status = ToolStatus.DISCONNECTED
            return ConnectorResult(
                success=False,
                error="confluent-kafka not installed",
                tool_name=self.name,
                action=action,
            )
        try:
            metadata = admin.list_topics(timeout=5)
            self._status = ToolStatus.CONNECTED
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            self._record_audit(action, True, True, ms)
            return ConnectorResult(
                success=True,
                data={
                    "connected": True,
                    "message": f"Connected to {self._bootstrap_servers}",
                    "topic_count": len(metadata.topics),
                    "broker_count": len(metadata.brokers),
                },
                tool_name=self.name, action=action, read_only=True, execution_time_ms=ms,
            )
        except Exception as e:
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            self._status = ToolStatus.ERROR
            self._record_audit(action, True, False, ms, str(e))
            return ConnectorResult(
                success=False, error=str(e), tool_name=self.name, action=action,
            )

    async def health(self) -> ConnectorHealth:
        start = datetime.utcnow()
        admin = self._get_admin()
        if not admin:
            return ConnectorHealth(status="error", details={"error": "Not connected"})
        try:
            metadata = admin.list_topics(timeout=5)
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            return ConnectorHealth(
                status="healthy",
                latency_ms=ms,
                details={
                    "topics": len(metadata.topics),
                    "brokers": len(metadata.brokers),
                    "bootstrap_servers": self._bootstrap_servers,
                },
            )
        except Exception as e:
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            return ConnectorHealth(status="error", latency_ms=ms, details={"error": str(e)})

    async def list_resources(self, resource_type: str = "topics") -> ConnectorResult:
        start = datetime.utcnow()
        action = f"list_{resource_type}"
        try:
            data: List[Dict] = []
            admin = self._get_admin()

            if resource_type == "topics" and admin:
                metadata = admin.list_topics(timeout=5)
                data = [
                    {"name": name, "partitions": len(info.partitions)}
                    for name, info in metadata.topics.items()
                ]

            ms = (datetime.utcnow() - start).total_seconds() * 1000
            self._record_audit(action, True, True, ms)
            return ConnectorResult(
                success=True, data=data, tool_name=self.name, action=action,
                read_only=True, execution_time_ms=ms,
            )
        except Exception as e:
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            self._record_audit(action, True, False, ms, str(e))
            return ConnectorResult(
                success=False, error=str(e), tool_name=self.name, action=action,
            )

    async def get_resource(self, resource_type: str, resource_id: str) -> ConnectorResult:
        start = datetime.utcnow()
        action = f"get_{resource_type}"
        try:
            data: Dict[str, Any] = {}
            admin = self._get_admin()

            if resource_type == "topic" and admin:
                metadata = admin.list_topics(timeout=5)
                if resource_id in metadata.topics:
                    info = metadata.topics[resource_id]
                    partitions_info = []
                    for pid, pinfo in info.partitions.items():
                        partitions_info.append({
                            "id": pid,
                            "leader": pinfo.leader,
                            "replicas": len(pinfo.replicas) if hasattr(pinfo, 'replicas') else 0,
                        })
                    data = {
                        "name": resource_id,
                        "partitions": len(info.partitions),
                        "partition_details": partitions_info,
                    }

            ms = (datetime.utcnow() - start).total_seconds() * 1000
            self._record_audit(action, True, True, ms)
            return ConnectorResult(
                success=True, data=data, tool_name=self.name, action=action,
                read_only=True, execution_time_ms=ms,
            )
        except Exception as e:
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            self._record_audit(action, True, False, ms, str(e))
            return ConnectorResult(
                success=False, error=str(e), tool_name=self.name, action=action,
            )

    async def execute(self, action: str, params: Dict[str, Any], dry_run: bool = False) -> ConnectorResult:
        start = datetime.utcnow()
        read_only = classify_mutation(action)
        admin = self._get_admin()

        if not admin:
            return ConnectorResult(
                success=False, error="confluent-kafka not installed",
                tool_name=self.name, action=action,
            )

        try:
            if action == "create_topic":
                validated = KafkaCreateTopicParams(**params)
                if dry_run:
                    ms = (datetime.utcnow() - start).total_seconds() * 1000
                    return ConnectorResult(
                        success=True,
                        data={"dry_run": True, "would_create": validated.topic, "partitions": validated.partitions},
                        tool_name=self.name, action=action, read_only=False, execution_time_ms=ms,
                    )
                from confluent_kafka.admin import NewTopic
                new_topic = NewTopic(
                    validated.topic,
                    num_partitions=validated.partitions,
                    replication_factor=validated.replication_factor,
                )
                futures = admin.create_topics([new_topic])
                futures[validated.topic].result(timeout=10)
                data = {"success": True, "message": f"Topic '{validated.topic}' created"}

            elif action == "delete_topic":
                validated = KafkaDeleteTopicParams(**params)
                if dry_run:
                    ms = (datetime.utcnow() - start).total_seconds() * 1000
                    return ConnectorResult(
                        success=True,
                        data={"dry_run": True, "would_delete": validated.topic},
                        tool_name=self.name, action=action, read_only=False, execution_time_ms=ms,
                    )
                futures = admin.delete_topics([validated.topic])
                futures[validated.topic].result(timeout=10)
                data = {"success": True, "message": f"Topic '{validated.topic}' deleted"}

            else:
                ms = (datetime.utcnow() - start).total_seconds() * 1000
                self._record_audit(action, read_only, False, ms, f"Unknown action: {action}")
                return ConnectorResult(
                    success=False, error=f"Unknown action: {action}",
                    tool_name=self.name, action=action,
                )

            ms = (datetime.utcnow() - start).total_seconds() * 1000
            self._record_audit(action, read_only, True, ms)
            return ConnectorResult(
                success=True, data=data, tool_name=self.name, action=action,
                read_only=read_only, execution_time_ms=ms,
            )
        except Exception as e:
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            self._record_audit(action, read_only, False, ms, str(e))
            return ConnectorResult(
                success=False, error=str(e), tool_name=self.name, action=action,
            )

    async def get_logs(self, resource_type: str, resource_id: str, limit: int = 50) -> ConnectorResult:
        start = datetime.utcnow()
        action = "logs"
        ms = (datetime.utcnow() - start).total_seconds() * 1000
        self._record_audit(action, True, True, ms)
        return ConnectorResult(
            success=True, data=[], tool_name=self.name, action=action,
            read_only=True, execution_time_ms=ms,
        )

    async def get_metrics(self) -> ConnectorResult:
        start = datetime.utcnow()
        action = "metrics"
        try:
            topics_result = await self.list_resources("topics")
            topics = topics_result.data or []
            data = {
                "total_topics": len(topics),
                "total_partitions": sum(t.get("partitions", 0) for t in topics),
                "status": self._status.value,
            }
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            self._record_audit(action, True, True, ms)
            return ConnectorResult(
                success=True, data=data, tool_name=self.name, action=action,
                read_only=True, execution_time_ms=ms,
            )
        except Exception as e:
            ms = (datetime.utcnow() - start).total_seconds() * 1000
            self._record_audit(action, True, False, ms, str(e))
            return ConnectorResult(
                success=False, error=str(e), tool_name=self.name, action=action,
            )


kafka_connector_v2 = KafkaConnectorV2()
