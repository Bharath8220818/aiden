"""
Services package — External integrations for AIDEN.

Each service wraps a third-party API or library and exposes
async methods for use by agents, API routers, and core logic.
"""

from app.services.airflow_service import AirflowService, airflow_service
from app.services.database_service import ExternalDatabaseService as DatabaseService
from app.services.dbt_service import DbtService, dbt_service
from app.services.hf_service import HuggingFaceService, hf_service
from app.services.kafka_service import KafkaService
from app.services.multimodal_service import MultimodalService, multimodal_service
from app.services.ollama_service import OllamaService
from app.services.snowflake_service import SnowflakeService
from app.services.spark_service import SparkService, spark_service
from app.services.supabase_service import SupabaseService
from app.services.vector_service import VectorService, vector_service
from app.services.vision_service import VisionService, vision_service
from app.services.whisper_service import WhisperService, whisper_service

__all__ = [
    "AirflowService", "airflow_service",
    "DatabaseService",
    "DbtService", "dbt_service",
    "HuggingFaceService", "hf_service",
    "KafkaService",
    "MultimodalService", "multimodal_service",
    "OllamaService",
    "SnowflakeService",
    "SparkService", "spark_service",
    "SupabaseService",
    "VectorService", "vector_service",
    "VisionService", "vision_service",
    "WhisperService", "whisper_service",
]
