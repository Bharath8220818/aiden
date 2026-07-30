from pydantic import BaseModel
from typing import Optional

class AnalyzeRequest(BaseModel):
    image: str  # base64 encoded image
    prompt: Optional[str] = "Describe this data pipeline diagram in detail."

class AnalyzeResponse(BaseModel):
    success: bool
    analysis: Optional[str] = None
    model: Optional[str] = None
    tokens: Optional[int] = None
    error: Optional[str] = None

class MultimodalStatus(BaseModel):
    available: bool
    mode: str = "local"  # "local", "remote", "disabled"
    model: Optional[str] = None
    loaded: bool = False
    remote_health: Optional[str] = None
