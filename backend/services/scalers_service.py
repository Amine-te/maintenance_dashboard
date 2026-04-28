from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple

import numpy as np
import pandas as pd
from fastapi import HTTPException
from sklearn.preprocessing import MinMaxScaler

from services.fd001_schema import FEATURE_COLS, RUL_MAX


@dataclass(frozen=True)
class FD001Scalers:
    scaler_x: MinMaxScaler
    scaler_y: MinMaxScaler
    rul_max: float


_cached: Optional[FD001Scalers] = None


def _load_train_raw_df() -> pd.DataFrame:
    root_dir = Path(__file__).resolve().parents[2]
    train_path = root_dir / "enhanced_data" / "train_raw.txt"
    if not train_path.exists():
        raise HTTPException(status_code=500, detail=f"Training file not found at '{train_path}'.")

    # NASA CMAPSS format: space-separated, sometimes trailing spaces
    cols: List[str] = ["engine_id", "cycle", "op_setting_1", "op_setting_2", "op_setting_3"] + [
        f"sensor_{i}" for i in range(1, 22)
    ]

    df = pd.read_csv(train_path, sep=r"\s+", header=None, names=cols, engine="python")
    return df


def _compute_rul(df: pd.DataFrame) -> pd.DataFrame:
    # RUL = max_cycle_per_engine - current_cycle
    max_cycle = df.groupby("engine_id")["cycle"].transform("max")
    df = df.copy()
    df["RUL"] = (max_cycle - df["cycle"]).astype(np.float32)
    return df


def get_fd001_scalers() -> FD001Scalers:
    global _cached
    if _cached is not None:
        return _cached

    df = _load_train_raw_df()
    df = _compute_rul(df)

    rul_max = float(RUL_MAX)
    df["RUL_clipped"] = df["RUL"].clip(upper=rul_max)

    scaler_x = MinMaxScaler()
    scaler_y = MinMaxScaler()

    try:
        scaler_x.fit(df[FEATURE_COLS].values.astype(np.float32))
        scaler_y.fit(df[["RUL_clipped"]].values.astype(np.float32))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fit FD001 scalers: {type(exc).__name__}: {exc}")

    _cached = FD001Scalers(scaler_x=scaler_x, scaler_y=scaler_y, rul_max=rul_max)
    return _cached

