"""
AIDEN Colab Proxy — Standalone FastAPI server for Google Colab.

Run behind an ngrok tunnel to provide LLaVA/Qwen-VL inference
to the AIDEN backend. Set MULTIMODAL_REMOTE_URL to the ngrok URL.

Usage:
    python -m app.services.colab_proxy
"""

import base64
import logging
from io import BytesIO

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AIDEN Colab Proxy")

_model = None
_processor = None


class AnalyzeRequest(BaseModel):
    image: str
    prompt: str | None = None
    temperature: float = 0.7
    max_tokens: int = 512


class AnalyzeResponse(BaseModel):
    success: bool
    analysis: str | None = None
    error: str | None = None


@app.on_event("startup")
async def load_model():
    global _model, _processor
    logger.info("Loading LLaVA model...")
    from transformers import LlavaNextForConditionalGeneration, LlavaNextProcessor
    _model = LlavaNextForConditionalGeneration.from_pretrained(
        "llava-hf/llava-v1.6-mistral-7b-hf",
        device_map="auto",
        torch_dtype="auto",
    )
    _processor = LlavaNextProcessor.from_pretrained(
        "llava-hf/llava-v1.6-mistral-7b-hf"
    )
    logger.info("Model loaded successfully.")


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    if _model is None or _processor is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")
    try:
        raw = request.image.split(",")[-1]
        image_bytes = base64.b64decode(raw)
        image = BytesIO(image_bytes)
        prompt = request.prompt or "Describe this pipeline architecture diagram."

        inputs = _processor(text=prompt, images=image, return_tensors="pt").to(_model.device)
        output = _model.generate(**inputs, max_new_tokens=request.max_tokens)
        analysis = _processor.decode(output[0], skip_special_tokens=True)

        return AnalyzeResponse(success=True, analysis=analysis)
    except Exception as e:
        logger.exception("Analysis failed")
        return AnalyzeResponse(success=False, error=str(e))


@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": _model is not None}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
