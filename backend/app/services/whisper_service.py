"""
Whisper Service — Speech-to-text transcription using OpenAI Whisper API.

Falls back to a mock implementation when the API key is not configured
or the API is unavailable.
"""

import logging
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


class WhisperService:
    """Transcribe audio using OpenAI Whisper API or mock fallback."""

    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY

    async def transcribe(self, audio_data: bytes, filename: str = "audio.wav") -> str:
        """Transcribe audio bytes to text using Whisper API."""
        if not self.api_key or self.api_key == "sk-...":
            return self._mock_transcribe(filename)

        try:
            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=self.api_key)
            transcript = await client.audio.transcriptions.create(
                model="whisper-1",
                file=(filename, audio_data, "audio/wav"),
            )
            return transcript.text
        except ImportError:
            logger.warning("openai package not installed — Whisper falls back to mock transcription")
            return self._mock_transcribe(filename)
        except Exception as e:
            logger.warning(f"Whisper API failed: {e} — falling back to mock")
            return self._mock_transcribe(filename)

    @staticmethod
    def _mock_transcribe(filename: str) -> str:
        """Mock transcription when API is unavailable."""
        return f"[Mock transcription of {filename}] Build a daily ETL pipeline from PostgreSQL to Snowflake with data cleaning and aggregation."


whisper_service = WhisperService()
