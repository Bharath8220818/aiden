"""
Vision Service — LLaVA/GPT-4V diagram parsing for architecture and schema diagrams.

Supports three modes:
1. Local: loads LLaVA via transformers (requires GPU + 8GB VRAM)
2. Remote: forwards requests to a Colab or remote API endpoint
3. Mock: returns placeholder analysis when neither is available
"""

import logging
import base64
from typing import Optional, Dict, Any
from io import BytesIO

from app.config import settings

logger = logging.getLogger(__name__)


class VisionService:
    """Analyze images (diagrams, schemas) using vision-capable models."""

    def __init__(self):
        self.model = None
        self.processor = None
        self.remote_url = settings.MULTIMODAL_REMOTE_URL
        self._load_model()

    def _load_model(self):
        """Attempt to load LLaVA locally. Falls back to remote or mock."""
        if self.remote_url:
            logger.info("Vision service configured in REMOTE mode → %s", self.remote_url)
            return

        if not settings.MULTIMODAL_ENABLED:
            logger.info("Vision service: DISABLED (MULTIMODAL_ENABLED=False)")
            return

        try:
            from transformers import LlavaForConditionalGeneration, AutoProcessor
            self.model = LlavaForConditionalGeneration.from_pretrained(
                settings.MULTIMODAL_MODEL,
                device_map="auto",
                load_in_4bit=True,
            )
            self.processor = AutoProcessor.from_pretrained(settings.MULTIMODAL_MODEL)
            logger.info("Vision model loaded: %s", settings.MULTIMODAL_MODEL)
        except Exception as e:
            logger.warning("Failed to load vision model locally: %s", e)

    async def analyze(self, image_data: bytes, prompt: str = "Describe this data architecture diagram.") -> Dict[str, Any]:
        """Analyze an image and return analysis text."""
        # Remote mode
        if self.remote_url:
            return await self._analyze_remote(image_data, prompt)

        # Local mode
        if self.model is not None and self.processor is not None:
            return await self._analyze_local(image_data, prompt)

        # Mock fallback
        return self._mock_analysis(prompt)

    async def _analyze_local(self, image_data: bytes, prompt: str) -> Dict[str, Any]:
        """Analyze using local LLaVA model."""
        try:
            from PIL import Image
            from io import BytesIO
            import torch

            image = Image.open(BytesIO(image_data))
            inputs = self.processor(text=prompt, images=image, return_tensors="pt").to(self.model.device)

            with torch.no_grad():
                output = self.model.generate(**inputs, max_new_tokens=256)

            result = self.processor.decode(output[0], skip_special_tokens=True)
            return {"analysis": result, "mode": "local", "success": True}
        except Exception as e:
            logger.error("Local vision analysis failed: %s", e)
            return {"analysis": f"Analysis failed: {e}", "mode": "local", "success": False}

    async def _analyze_remote(self, image_data: bytes, prompt: str) -> Dict[str, Any]:
        """Forward analysis to a remote endpoint (e.g., Colab)."""
        import httpx

        try:
            b64 = base64.b64encode(image_data).decode("utf-8")
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{self.remote_url}/analyze",
                    json={"image": b64, "prompt": prompt},
                )
                resp.raise_for_status()
                data = resp.json()
                return {"analysis": data.get("analysis", ""), "mode": "remote", "success": True}
        except Exception as e:
            logger.error("Remote vision analysis failed: %s", e)
            return {"analysis": f"Remote analysis failed: {e}", "mode": "remote", "success": False}

    @staticmethod
    def _mock_analysis(prompt: str) -> Dict[str, Any]:
        """Return a placeholder analysis when no model is available."""
        return {
            "analysis": f"[Mock vision analysis for: {prompt[:100]}...] The diagram shows a cloud architecture with source systems ingesting data through a streaming layer into a data lake, with transformations in the medallion layers and BI tools querying the gold layer.",
            "mode": "mock",
            "success": True,
        }


vision_service = VisionService()
