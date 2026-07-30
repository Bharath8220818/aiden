"""
Kafka Service — Kafka admin and producer/consumer operations.

Provides topic management, message production, and consumer group
management using the confluent-kafka library.
"""

import logging
from typing import Dict, Any, List, Optional, Callable
import json

logger = logging.getLogger(__name__)


class KafkaService:
    """Manage Kafka topics and produce/consume messages."""

    def __init__(self, bootstrap_servers: str = "localhost:9092"):
        self.bootstrap_servers = bootstrap_servers
        self._admin = None

    def _get_admin(self):
        """Lazy-init Kafka admin client."""
        if self._admin is None:
            try:
                from confluent_kafka.admin import AdminClient
                self._admin = AdminClient({"bootstrap.servers": self.bootstrap_servers})
            except ImportError:
                logger.warning("confluent-kafka not installed")
        return self._admin

    async def list_topics(self) -> List[str]:
        """List all Kafka topics."""
        admin = self._get_admin()
        if not admin:
            return []
        metadata = admin.list_topics(timeout=5)
        return list(metadata.topics.keys())

    async def create_topic(self, topic: str, partitions: int = 3, replication_factor: int = 1) -> bool:
        """Create a Kafka topic."""
        admin = self._get_admin()
        if not admin:
            return False
        try:
            from confluent_kafka.admin import NewTopic
            futures = admin.create_topics([
                NewTopic(topic, num_partitions=partitions, replication_factor=replication_factor)
            ])
            futures[topic].result(timeout=10)
            return True
        except Exception as e:
            logger.error("Failed to create topic %s: %s", topic, e)
            return False

    async def delete_topic(self, topic: str) -> bool:
        """Delete a Kafka topic."""
        admin = self._get_admin()
        if not admin:
            return False
        try:
            futures = admin.delete_topics([topic])
            futures[topic].result(timeout=10)
            return True
        except Exception as e:
            logger.error("Failed to delete topic %s: %s", topic, e)
            return False
