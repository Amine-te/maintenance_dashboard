from __future__ import annotations

from typing import List, Sequence
import numpy as np
from fastapi import HTTPException

from services.scalers_service import get_fd001_scalers
from services.fd001_schema import FEATURE_COLS, WINDOW_SIZE

def preprocess_sequence(sequence: Sequence[Sequence[float]]) -> np.ndarray:
    if not sequence:
        raise HTTPException(status_code=422, detail="Sequence is required and cannot be empty.")

    array = np.array(sequence, dtype=np.float32)
    expected_features = len(FEATURE_COLS)

    if array.ndim != 2:
        raise HTTPException(status_code=422, detail="Sequence must be a 2D array [timesteps, features].")

    if array.shape[1] != expected_features:
        raise HTTPException(
            status_code=422,
            detail=f"Each timestep must contain {expected_features} features in this order: {FEATURE_COLS}.",
        )

    if np.isnan(array).any() or np.isinf(array).any():
        raise HTTPException(status_code=422, detail="Sequence cannot contain NaN or infinite values.")

    # Match training-time scaling (MinMaxScaler on FD001 train set).
    scalers = get_fd001_scalers()
    try:
        array = scalers.scaler_x.transform(array).astype(np.float32)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Failed to scale input sequence: {type(exc).__name__}: {exc}")

    # Keep parity with training where shorter units were left-padded with zeros.
    if array.shape[0] < WINDOW_SIZE:
        pad_len = WINDOW_SIZE - array.shape[0]
        pad = np.zeros((pad_len, expected_features), dtype=np.float32)
        array = np.vstack([pad, array])
    elif array.shape[0] > WINDOW_SIZE:
        array = array[-WINDOW_SIZE:, :]

    return np.expand_dims(array, axis=0)


def list_feature_columns() -> List[str]:
    return FEATURE_COLS
