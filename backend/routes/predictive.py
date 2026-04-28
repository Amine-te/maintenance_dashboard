from __future__ import annotations

from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.model_service import rul_model_service
from services.preprocessing import preprocess_sequence, list_feature_columns
from services.fd001_schema import WINDOW_SIZE

router = APIRouter()


class PredictRequest(BaseModel):
    sequence: List[List[float]] = Field(..., description="Time-series values [timesteps, features].")


class PredictResponse(BaseModel):
    predicted_rul: float
    predicted_rul_scaled: float
    risk_level: str
    risk_score: float
    recommendation: str
    model_path: str
    expected_window_size: int
    expected_features: List[str]


@router.get("/metadata")
async def predictive_metadata():
    return {
        "expected_window_size": WINDOW_SIZE,
        "expected_features": list_feature_columns(),
        "feature_count": len(list_feature_columns()),
    }


@router.post("/predict", response_model=PredictResponse)
async def predict_rul(payload: PredictRequest):
    try:
        model_input = preprocess_sequence(payload.sequence)
        result = rul_model_service.predict(model_input)
        return {
            **result,
            "expected_window_size": WINDOW_SIZE,
            "expected_features": list_feature_columns(),
        }
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Unexpected error during RUL prediction.")
