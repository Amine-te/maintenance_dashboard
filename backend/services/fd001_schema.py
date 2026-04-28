from __future__ import annotations

# Shared FD001 schema/constants used across preprocessing and scaling.

DROP_SENSORS = {
    "sensor_1",
    "sensor_5",
    "sensor_6",
    "sensor_10",
    "sensor_16",
    "sensor_18",
    "sensor_19",
}

OP_COLS = ["op_setting_1", "op_setting_2", "op_setting_3"]
SENSOR_COLS = [f"sensor_{idx}" for idx in range(1, 22) if f"sensor_{idx}" not in DROP_SENSORS]
FEATURE_COLS = OP_COLS + SENSOR_COLS

WINDOW_SIZE = 30
RUL_MAX = 125.0

