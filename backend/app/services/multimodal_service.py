"""
Multimodal Service — Image + Text understanding using LLaVA / Qwen-VL

Two operation modes:
  1. LOCAL:  Loads the model directly (requires CUDA GPU + 16GB VRAM)
  2. REMOTE: Proxies requests to a remote Colab/GPU endpoint via httpx

Singleton pattern with graceful fallback when dependencies are unavailable.
"""

import base64
import logging
from io import BytesIO
from pathlib import Path
from typing import Optional, Dict, Any
from PIL import Image

import torch

from app.config import settings

logger = logging.getLogger(__name__)

# ── Conditional imports (local inference only) ─────────────────────────
try:
    from transformers import (
        LlavaNextProcessor,
        LlavaNextForConditionalGeneration,
        BitsAndBytesConfig,
        AutoProcessor,
        Qwen2VLForConditionalGeneration,
    )
    from peft import PeftModel
    MULTIMODAL_AVAILABLE = True
except ImportError as exc:
    MULTIMODAL_AVAILABLE = False
    MULTIMODAL_IMPORT_ERROR = exc
    logger.warning(f"Multimodal dependencies not fully installed: {exc}")

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False
    logger.warning("httpx not installed — remote proxy mode disabled")


class MultimodalService:
    """
    Singleton service for multimodal inference.

    Mode 1 — Local:
        Loads LLaVA/Qwen-VL model directly (requires CUDA).
        Set ``MULTIMODAL_ENABLED=True`` in .env.

    Mode 2 — Remote Proxy:
        Forwards requests to a remote GPU endpoint (e.g. Colab + ngrok).
        Set ``MULTIMODAL_REMOTE_URL=https://your-ngrok-url`` in .env.
        No local GPU needed — works on any machine with internet.
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if hasattr(self, "_initialized"):
            return
        self._initialized = True

        self.model = None
        self.processor = None
        self.model_type = None
        self._loaded = False
        self._remote_url: Optional[str] = None

        # ── Mode 2: Remote proxy (check first — works without local GPU) ──
        remote_url = settings.MULTIMODAL_REMOTE_URL
        if remote_url:
            self._remote_url = remote_url.rstrip("/")
            if HTTPX_AVAILABLE:
                self._loaded = True
                logger.info(
                    f"Multimodal service in REMOTE PROXY mode → {self._remote_url}"
                )
                return  # Skip local model loading
            else:
                logger.warning(
                    "MULTIMODAL_REMOTE_URL is set but httpx is not installed. "
                    "Run: pip install httpx"
                )

        # ── Mode 1: Local inference ───────────────────────────────────────
        if not MULTIMODAL_AVAILABLE:
            logger.warning(
                "Multimodal dependencies not available. "
                "Service will run in fallback mode."
            )
            return

        if settings.MULTIMODAL_ENABLED:
            self._load_model()

    # ── Remote proxy helpers ──────────────────────────────────────────────

    async def _remote_request(self, payload: dict) -> Dict[str, Any]:
        """Send a request to the remote multimodal endpoint."""
        if not self._remote_url:
            return {"success": False, "error": "No remote URL configured"}

        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                resp = await client.post(
                    f"{self._remote_url}/analyze",
                    json=payload,
                )
                resp.raise_for_status()
                return resp.json()
            except httpx.TimeoutException:
                logger.error("Remote multimodal request timed out (120s)")
                return {
                    "success": False,
                    "error": "Remote inference timed out. The Colab notebook may have disconnected.",
                }
            except Exception as e:
                logger.error(f"Remote multimodal request failed: {e}")
                return {"success": False, "error": str(e)}

    async def _remote_status(self) -> Dict[str, Any]:
        """Check remote endpoint health."""
        if not self._remote_url:
            return {"available": False, "error": "No remote URL configured"}

        async with httpx.AsyncClient(timeout=5.0) as client:
            try:
                resp = await client.get(f"{self._remote_url}/status")
                if resp.status_code == 200:
                    return resp.json()
                return {"available": False, "error": f"HTTP {resp.status_code}"}
            except Exception as e:
                return {"available": False, "error": str(e)}

    # ── Local model loading ───────────────────────────────────────────────

    def _load_model(self):
        """Load the multimodal model with 4-bit quantization (if CUDA available)."""
        try:
            logger.info("Loading multimodal model...")

            model_id = settings.MULTIMODAL_MODEL or "llava-hf/llava-v1.6-mistral-7b-hf"

            if torch.cuda.is_available():
                bnb_config = BitsAndBytesConfig(
                    load_in_4bit=True,
                    bnb_4bit_compute_dtype=torch.float16,
                    bnb_4bit_use_double_quant=True,
                )
                device_map = "auto"
                use_quantization = True
                logger.info("CUDA available — using 4-bit quantization")
            else:
                bnb_config = None
                device_map = "cpu"
                use_quantization = False
                logger.info("CUDA not available — loading on CPU (slower)")

            if "llava" in model_id.lower():
                self.model_type = "llava"
                self.processor = LlavaNextProcessor.from_pretrained(model_id)

                if use_quantization:
                    self.model = LlavaNextForConditionalGeneration.from_pretrained(
                        model_id,
                        quantization_config=bnb_config,
                        device_map=device_map,
                        trust_remote_code=True,
                    )
                else:
                    self.model = LlavaNextForConditionalGeneration.from_pretrained(
                        model_id,
                        device_map=device_map,
                        torch_dtype=torch.float32,
                        trust_remote_code=True,
                    )

            elif "qwen" in model_id.lower():
                self.model_type = "qwen"
                self.processor = AutoProcessor.from_pretrained(model_id)

                if use_quantization:
                    self.model = Qwen2VLForConditionalGeneration.from_pretrained(
                        model_id,
                        quantization_config=bnb_config,
                        device_map=device_map,
                        trust_remote_code=True,
                    )
                else:
                    self.model = Qwen2VLForConditionalGeneration.from_pretrained(
                        model_id,
                        device_map=device_map,
                        torch_dtype=torch.float32,
                        trust_remote_code=True,
                    )
            else:
                raise ValueError(f"Unsupported multimodal model: {model_id}")

            adapter_path = settings.MULTIMODAL_ADAPTER_PATH
            if adapter_path and Path(adapter_path).exists():
                logger.info(f"Loading LoRA adapter from: {adapter_path}")
                self.model = PeftModel.from_pretrained(self.model, adapter_path)
                self.model = self.model.merge_and_unload()

            self._loaded = True
            logger.info(f"Multimodal model loaded: {model_id}")

        except Exception as e:
            logger.error(f"Failed to load multimodal model: {e}")
            self._loaded = False

    # ── Public API ────────────────────────────────────────────────────────

    def is_available(self) -> bool:
        """Check if the multimodal service is available (local or remote)."""
        return self._loaded

    def is_remote(self) -> bool:
        """Check if running in remote proxy mode."""
        return self._remote_url is not None

    def get_mode(self) -> str:
        """Return the current operation mode."""
        if self._remote_url:
            return f"remote → {self._remote_url}"
        return "local" if self._loaded else "unavailable"

    async def check_remote_health(self) -> Dict[str, Any]:
        """Check if the remote endpoint is reachable."""
        if not self._remote_url:
            return {"available": False}
        status = await self._remote_status()
        return status

    async def analyze_diagram(
        self,
        image_data: str,
        prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 512,
    ) -> Dict[str, Any]:
        """
        Analyze a pipeline diagram from a base64 image.

        In remote mode, proxies to the configured Colab/GPU endpoint.
        In local mode, runs inference directly.

        Args:
            image_data: Base64-encoded image (data:image/png;base64,...)
            prompt: User's question
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate

        Returns:
            Dict with 'success', 'analysis', 'model', 'prompt', 'tokens'
        """
        if not self.is_available():
            return {
                "success": False,
                "error": "Multimodal service unavailable. "
                         "Set MULTIMODAL_REMOTE_URL for Colab proxy "
                         "or MULTIMODAL_ENABLED=True for local GPU inference.",
            }

        # ── Remote proxy mode ───────────────────────────────────────────
        if self._remote_url:
            payload = {
                "image": image_data,
                "prompt": prompt or "Describe this data pipeline diagram in detail.",
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            result = await self._remote_request(payload)
            if result.get("success"):
                result["mode"] = "remote"
            return result

        # ── Local inference mode ─────────────────────────────────────────
        try:
            if image_data.startswith("data:image"):
                image_data = image_data.split(",")[1]
            image_bytes = base64.b64decode(image_data)
            image = Image.open(BytesIO(image_bytes))

            if not prompt:
                prompt = "Describe this data pipeline diagram in detail."

            if self.model_type == "llava":
                conversation = [
                    {
                        "role": "user",
                        "content": [
                            {"type": "image", "image": image},
                            {"type": "text", "text": prompt},
                        ],
                    }
                ]
                inputs = self.processor.apply_chat_template(
                    conversation,
                    tokenize=True,
                    return_tensors="pt",
                    add_generation_prompt=True,
                )
            elif self.model_type == "qwen":
                messages = [
                    {
                        "role": "user",
                        "content": [
                            {"type": "image", "image": image},
                            {"type": "text", "text": prompt},
                        ],
                    }
                ]
                text = self.processor.apply_chat_template(
                    messages, tokenize=False, add_generation_prompt=True
                )
                inputs = self.processor(
                    text=[text], images=[image], padding=True, return_tensors="pt",
                )
            else:
                return {"success": False, "error": f"Unsupported model type: {self.model_type}"}

            # transformers >=4.46 returns a plain Tensor; older versions return BatchFeature (dict)
            if isinstance(inputs, dict) or hasattr(inputs, "items"):
                inputs_dict = {k: v.to(self.model.device) for k, v in inputs.items()}
                with torch.no_grad():
                    outputs = self.model.generate(
                        **inputs_dict,
                        max_new_tokens=max_tokens,
                        temperature=temperature,
                        do_sample=True,
                        pad_token_id=self.processor.tokenizer.eos_token_id,
                    )
            else:
                input_ids = inputs.to(self.model.device)
                with torch.no_grad():
                    outputs = self.model.generate(
                        input_ids,
                        max_new_tokens=max_tokens,
                        temperature=temperature,
                        do_sample=True,
                        pad_token_id=self.processor.tokenizer.eos_token_id,
                    )

            response = self.processor.decode(outputs[0], skip_special_tokens=True)
            if "assistant" in response:
                response = response.split("assistant")[-1].strip()

            return {
                "success": True,
                "analysis": response,
                "model": settings.MULTIMODAL_MODEL,
                "prompt": prompt,
                "tokens": len(response.split()),
                "mode": "local",
            }

        except Exception as e:
            logger.error(f"Multimodal analysis failed: {e}")
            return {"success": False, "error": str(e)}


# ─── Singleton ──────────────────────────────────────────────────────────
multimodal_service = MultimodalService()
