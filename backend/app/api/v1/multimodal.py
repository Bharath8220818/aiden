"""
Multimodal API Endpoints
Image upload + analysis using the multimodal service.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
import base64

from app.services.multimodal_service import multimodal_service
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.config import settings

router = APIRouter()

# ─── Schemas ────────────────────────────────────────────────────────────


class AnalyzeRequest(BaseModel):
    image: str  # Base64 data URL
    prompt: Optional[str] = None
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 512


class AnalyzeResponse(BaseModel):
    success: bool
    analysis: Optional[str] = None
    error: Optional[str] = None
    model: Optional[str] = None
    prompt: Optional[str] = None
    tokens: Optional[int] = None


# ─── Endpoints ──────────────────────────────────────────────────────────


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_diagram(
    request: AnalyzeRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Analyze a pipeline diagram from a base64 image.
    """
    if not multimodal_service.is_available():
        raise HTTPException(
            status_code=503,
            detail="Multimodal service unavailable. Please check dependencies.",
        )

    result = await multimodal_service.analyze_diagram(
        image_data=request.image,
        prompt=request.prompt,
        temperature=request.temperature,
        max_tokens=request.max_tokens,
    )

    if not result["success"]:
        # Upstream (local GPU or remote Colab proxy) failure — report as a
        # graceful 503 rather than a server error.
        raise HTTPException(
            status_code=503,
            detail=result.get("error", "Analysis failed — multimodal backend unavailable"),
        )

    return result


@router.post("/upload", response_model=AnalyzeResponse)
async def upload_and_analyze(
    file: UploadFile = File(...),
    prompt: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    """
    Upload an image file and analyze it.
    """
    if not multimodal_service.is_available():
        raise HTTPException(
            status_code=503,
            detail="Multimodal service unavailable. Please check dependencies.",
        )

    contents = await file.read()
    b64 = base64.b64encode(contents).decode("utf-8")
    image_data = f"data:image/{file.content_type.split('/')[-1]};base64,{b64}"

    result = await multimodal_service.analyze_diagram(
        image_data=image_data,
        prompt=prompt,
    )

    if not result["success"]:
        raise HTTPException(
            status_code=503,
            detail=result.get("error", "Analysis failed — multimodal backend unavailable"),
        )

    return result


@router.get("/status")
async def multimodal_status(current_user: User = Depends(get_current_user)):
    """
    Check if multimodal service is available.
    Returns remote proxy status when MULTIMODAL_REMOTE_URL is configured.
    """
    available = multimodal_service.is_available()
    mode = multimodal_service.get_mode()
    remote_health = None

    if multimodal_service.is_remote():
        remote_health = await multimodal_service.check_remote_health()

    return {
        "available": available,
        "model": settings.MULTIMODAL_MODEL if available else None,
        "loaded": available,
        "mode": mode,
        "remote_url": settings.MULTIMODAL_REMOTE_URL,
        "remote_health": remote_health,
    }