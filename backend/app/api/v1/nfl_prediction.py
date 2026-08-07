from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional

from app.api.v1.deps import get_current_user
from app.models.user import User
from app.services.nfl_prediction_service import nfl_prediction_service

router = APIRouter()


class NFLFeatureRow(BaseModel):
    features: Dict[str, Any] = Field(
        ..., description="A single row of feature names and values for prediction."
    )


class NFLPredictionRequest(BaseModel):
    rows: List[NFLFeatureRow] = Field(
        ..., min_length=1, description="List of feature rows to predict."
    )


class NFLPredictionResponse(BaseModel):
    success: bool
    predictions: Optional[List[float]] = None
    error: Optional[str] = None


@router.post("/nfl", response_model=NFLPredictionResponse)
async def predict_nfl(
    request: NFLPredictionRequest,
    current_user: User = Depends(get_current_user),
):
    if not nfl_prediction_service.is_available():
        raise HTTPException(
            status_code=503,
            detail="NFL prediction pipeline is unavailable. Ensure the model artifacts are present and valid.",
        )

    try:
        feature_rows = [row.features for row in request.rows]
        predictions = nfl_prediction_service.predict(feature_rows)
        return NFLPredictionResponse(success=True, predictions=predictions)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
