"""
Kafka Connector — wraps Kafka admin operations via the Tool Gateway.

Capabilities: list_topics, create_topic, delete_topic, get_consumer_lag, produce, consume
"""

import logging
from typing import Dict, Any, List, Optional

from app.tools.connector_base import ToolConnector, ToolCategory, ToolStatus

logger = logging.getLogger(__name__)


class KafkaConnector(ToolConnector):
    name = "kafka"
    display_name = "Apache Kafka"
    category = ToolCategory.STREAM_PROCESSOR
    icon = "📡"
    description = "Stream and process real-time data events with Apache Kafka"

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        self.bootstrap_servers = self.config.get("bootstrap_servers", "localhost:9092")
        self._admin = None
        self._capabilities = [
            "list_topics", "create_topic", "delete_topic",
            "get_consumer_lag", "get_topic_info", "produce", "consume",
        ]

    def _get_admin(self):
        if self._admin is None:
            try:
                from confluent_kafka.admin import AdminClient
                self._admin = AdminClient({"bootstrap.servers": self.bootstrap_servers})
            except ImportError:
                logger.warning("confluent-kafka not installed")
        return self._admin

    async def test(self) -> Dict[str, Any]:
        admin = self._get_admin()
        if not admin:
            self._status = ToolStatus.ERROR
            return {"connected": False, "message": "confluent-kafka not installed"}
        try:
            metadata = admin.list_topics(timeout=5)
            self._status = ToolStatus.CONNECTED
            return {
                "connected": True,
                "message": f"Connected to {self.bootstrap_servers}",
                "topic_count": len(metadata.topics),
                "brokers": len(metadata.brokers),
            }
        except Exception as e:
            self._status = ToolStatus.ERROR
            return {"connected": False, "message": str(e)}

    async def health(self) -> Dict[str, Any]:
        admin = self._get_admin()
        if not admin:
            return {"status": "error", "details": {"error": "Not connected"}}
        try:
            metadata = admin.list_topics(timeout=5)
            return {
                "status": "healthy",
                "details": {
                    "topics": len(metadata.topics),
                    "brokers": len(metadata.brokers),
                    "bootstrap_servers": self.bootstrap_servers,
                },
            }
        except Exception as e:
            return {"status": "error", "details": {"error": str(e)}}

    async def list(self, resource_type: str = "topics") -> List[Dict[str, Any]]:
        if resource_type == "topics":
            admin = self._get_admin()
            if not admin:
                return []
            metadata = admin.list_topics(timeout=5)
            return [{"name": name, "partitions": len(info.partitions)} for name, info in metadata.topics.items()]
        elif resource_type == "consumer_groups":
            return []  # Requires additional API
        return []

    async def get(self, resource_type: str, resource_id: str) -> Dict[str, Any]:
        if resource_type == "topic":
            admin = self._get_admin()
            if not admin:
                return {}
            metadata = admin.list_topics(timeout=5)
            if resource_id in metadata.topics:
                info = metadata.topics[resource_id]
                return {
                    "name": resource_id,
                    "partitions": len(info.partitions),
                    "replication_factor": list(info.partitions.values())[0].replica if info.partitions else 0,
                }
        return {}

    async def execute(self, action: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        params = params or {}
        admin = self._get_admin()
        if not admin:
            return {"error": "Not connected"}
        if action == "create_topic":
            topic = params.get("topic", "")
            partitions = params.get("partitions", 3)
            try:
                from confluent_kafka.admin import NewTopic
                futures = admin.create_topics([NewTopic(topic, num_partitions=partitions, replication_factor=1)])
                futures[topic].result(timeout=10)
                return {"success": True, "message": f"Topic '{topic}' created"}
            except Exception as e:
                return {"error": str(e)}
        elif action == "delete_topic":
            topic = params.get("topic", "")
            try:
                futures = admin.delete_topics([topic])
                futures[topic].result(timeout=10)
                return {"success": True, "message": f"Topic '{topic}' deleted"}
            except Exception as e:
                return {"error": str(e)}
        return {"error": f"Unknown action: {action}"}

    async def logs(self, resource_type: str, resource_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        return []  # Kafka doesn't have a standard log API

    async def metrics(self) -> Dict[str, Any]:
        topics = await self.list("topics")
        return {
            "total_topics": len(topics),
            "total_partitions": sum(t.get("partitions", 0) for t in topics),
            "status": self._status.value,
        }


kafka_connector = KafkaConnector()
