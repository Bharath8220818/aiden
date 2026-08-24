"""
S3 / Object Storage Connector — wraps S3-compatible APIs via the Tool Gateway.

Capabilities: list_buckets, list_objects, upload, download, get_metrics
"""

import logging
from typing import Dict, Any, List, Optional

from app.tools.connector_base import ToolConnector, ToolCategory, ToolStatus

logger = logging.getLogger(__name__)


class S3Connector(ToolConnector):
    name = "s3"
    display_name = "Amazon S3"
    category = ToolCategory.STORAGE
    icon = "📦"
    description = "Store and manage data in S3-compatible object storage"

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(config)
        self.endpoint_url = self.config.get("endpoint_url", "")
        self.region = self.config.get("region", "us-east-1")
        self._client = None
        self._capabilities = [
            "list_buckets", "list_objects", "upload_object",
            "download_object", "delete_object", "get_bucket_metrics",
        ]

    def _get_client(self):
        if self._client is None:
            try:
                import boto3
                kwargs = {"region_name": self.region}
                if self.endpoint_url:
                    kwargs["endpoint_url"] = self.endpoint_url
                self._client = boto3.client("s3", **kwargs)
            except ImportError:
                logger.warning("boto3 not installed")
            except Exception as e:
                logger.error("Failed to create S3 client: %s", e)
        return self._client

    async def test(self) -> Dict[str, Any]:
        client = self._get_client()
        if not client:
            self._status = ToolStatus.ERROR
            return {"connected": False, "message": "boto3 not installed or AWS not configured"}
        try:
            client.list_buckets()
            self._status = ToolStatus.CONNECTED
            return {"connected": True, "message": "S3 connection successful"}
        except Exception as e:
            self._status = ToolStatus.ERROR
            return {"connected": False, "message": str(e)}

    async def health(self) -> Dict[str, Any]:
        client = self._get_client()
        if not client:
            return {"status": "error", "details": {"error": "Not connected"}}
        try:
            buckets = client.list_buckets().get("Buckets", [])
            return {"status": "healthy", "details": {"bucket_count": len(buckets)}}
        except Exception as e:
            return {"status": "error", "details": {"error": str(e)}}

    async def list(self, resource_type: str = "buckets") -> List[Dict[str, Any]]:
        client = self._get_client()
        if not client:
            return []
        try:
            if resource_type == "buckets":
                buckets = client.list_buckets().get("Buckets", [])
                return [{"name": b["Name"], "created": str(b.get("CreationDate", ""))} for b in buckets]
            elif resource_type == "objects":
                bucket = self.config.get("default_bucket", "")
                if bucket:
                    resp = client.list_objects_v2(Bucket=bucket, MaxKeys=100)
                    return [{"key": o["Key"], "size": o["Size"], "last_modified": str(o.get("LastModified", ""))} for o in resp.get("Contents", [])]
        except Exception as e:
            logger.error("S3 list error: %s", e)
        return []

    async def get(self, resource_type: str, resource_id: str) -> Dict[str, Any]:
        client = self._get_client()
        if not client:
            return {}
        try:
            if resource_type == "object":
                bucket = self.config.get("default_bucket", "")
                resp = client.head_object(Bucket=bucket, Key=resource_id)
                return {"key": resource_id, "size": resp.get("ContentLength", 0), "content_type": resp.get("ContentType", "")}
        except Exception:
            pass
        return {}

    async def execute(self, action: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        params = params or {}
        client = self._get_client()
        if not client:
            return {"error": "Not connected"}
        try:
            if action == "upload":
                bucket = params.get("bucket", "")
                key = params.get("key", "")
                body = params.get("body", b"")
                client.put_object(Bucket=bucket, Key=key, Body=body)
                return {"success": True, "key": key}
            elif action == "delete":
                bucket = params.get("bucket", "")
                key = params.get("key", "")
                client.delete_object(Bucket=bucket, Key=key)
                return {"success": True, "message": f"Deleted {key}"}
        except Exception as e:
            return {"error": str(e)}
        return {"error": f"Unknown action: {action}"}

    async def logs(self, resource_type: str, resource_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        return []  # S3 access logs require separate bucket configuration

    async def metrics(self) -> Dict[str, Any]:
        buckets = await self.list("buckets")
        return {
            "total_buckets": len(buckets),
            "status": self._status.value,
        }


s3_connector = S3Connector()
