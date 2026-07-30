from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.database import get_db
from app.models.user import User
from app.api.v1.deps import get_current_user

router = APIRouter()

@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Transcribe audio to text using Whisper."""
    try:
        content = await file.read()
        file_size = len(content)

        # Mock response — in production, calls Whisper API
        return {
            "success": True,
            "text": "Build a daily sales ETL from PostgreSQL to Snowflake with data cleaning.",
            "language": language or "en",
            "duration_seconds": file_size / 16000 / 2 if file_size > 0 else 0,
            "model": "whisper-1",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

@router.post("/transcribe-url")
async def transcribe_from_url(
    audio_url: str,
    language: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Transcribe audio from a URL."""
    return {
        "success": True,
        "text": "Build a pipeline from PostgreSQL to Snowflake.",
        "language": language or "en",
        "model": "whisper-1",
    }
