from __future__ import annotations

import os
from pathlib import Path
from typing import Dict, Any

from fastapi import HTTPException
import numpy as np
from tensorflow import keras

from services.scalers_service import get_fd001_scalers


class RULModelService:
    def __init__(self) -> None:
        self._model = None
        self._model_path = self._resolve_model_path()

    def _resolve_model_path(self) -> Path:
        env_path = os.getenv("RUL_MODEL_PATH", "models/lstm_rul_fd001.h5")
        root_dir = Path(__file__).resolve().parents[2]
        path = Path(env_path)
        return path if path.is_absolute() else root_dir / path

    def _load_model(self):
        if self._model is None:
            if not self._model_path.exists():
                raise HTTPException(
                    status_code=500,
                    detail=f"RUL model file not found at '{self._model_path}'. Set RUL_MODEL_PATH correctly.",
                )
            # Inference-only: avoid deserializing optimizer/loss from training time.
            self._model = keras.models.load_model(self._model_path, compile=False)
        return self._model

    def predict(self, model_input: np.ndarray) -> Dict[str, Any]:
        try:
            model = self._load_model()
            prediction = model.predict(model_input, verbose=0)
            rul_scaled = float(np.asarray(prediction).reshape(-1)[0])
            scalers = get_fd001_scalers()
            rul_value = float(scalers.scaler_y.inverse_transform(np.array([[rul_scaled]], dtype=np.float32)).reshape(-1)[0])
        except HTTPException:
            raise
        except Exception as exc:
            # Surface enough detail for local debugging without dumping internals.
            raise HTTPException(status_code=500, detail=f"Prediction failed due to an internal model error: {type(exc).__name__}: {exc}")

        # Continuous risk score in [0, 1] based on clipped RUL range.
        rul_max = float(scalers.rul_max)
        risk_score = 1.0 - max(0.0, min(1.0, rul_value / rul_max))

        if rul_value <= 10:
            risk_level = "high"
            recommendation = "Critical: schedule maintenance immediately (next few cycles)."
        elif rul_value <= 25:
            risk_level = "high"
            recommendation = "High risk: inspect soon and prepare maintenance resources."
        elif rul_value <= 50:
            risk_level = "medium"
            recommendation = "Medium risk: plan maintenance in the near term."
        else:
            risk_level = "low"
            recommendation = "Low risk: keep regular monitoring."

        return {
            "predicted_rul": round(rul_value, 2),
            "predicted_rul_scaled": round(rul_scaled, 6),
            "risk_level": risk_level,
            "risk_score": round(risk_score, 4),
            "recommendation": recommendation,
            "model_path": str(self._model_path),
        }


rul_model_service = RULModelService()
