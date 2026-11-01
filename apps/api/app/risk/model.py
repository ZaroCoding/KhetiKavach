"""LightGBM dry-spell model: P(dry spell in the next 15 days | rain observed so far).

Trained by scripts/train_dryspell.py on IMD gridded rainfall only, so it can run for any past date
without a forecast: Time Machine uses it before archived model runs exist (2024-03-14). Inputs
end the day before `as_of`, so it cannot see the future. Metrics are served exactly as written.
"""

import json
import math
from datetime import date
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np

from app.config import get_settings
from app.risk.engine import DRY_DAY_MM

FEATURES = [
    "rain_7d",
    "rain_15d",
    "rain_30d",
    "rain_60d",
    "dry_run_now",
    "wet_days_30d",
    "doy_sin",
    "doy_cos",
    "clim_p_dry",
    "lat",
    "lon",
]


def features_from_series(
    rain: list[float], as_of: date, clim_p_dry: float, lat: float, lon: float
) -> dict[str, float]:
    """`rain` = daily mm for the 60 days ending the day before `as_of`, oldest first."""
    r = np.asarray(rain[-60:], dtype=float)
    run = 0
    for v in r[::-1]:
        if v < DRY_DAY_MM:
            run += 1
        else:
            break
    doy = as_of.timetuple().tm_yday
    return {
        "rain_7d": float(r[-7:].sum()),
        "rain_15d": float(r[-15:].sum()),
        "rain_30d": float(r[-30:].sum()),
        "rain_60d": float(r.sum()),
        "dry_run_now": float(run),
        "wet_days_30d": float((r[-30:] >= DRY_DAY_MM).sum()),
        "doy_sin": math.sin(2 * math.pi * doy / 365.25),
        "doy_cos": math.cos(2 * math.pi * doy / 365.25),
        "clim_p_dry": clim_p_dry,
        "lat": lat,
        "lon": lon,
    }


@lru_cache(maxsize=1)
def load() -> Any:
    import joblib

    path = Path(get_settings().model_path)
    return joblib.load(path) if path.exists() else None


def metrics() -> dict[str, Any] | None:
    path = Path(get_settings().model_metrics_path)
    if not path.exists():
        return None
    data: dict[str, Any] = json.loads(path.read_text())
    return data


def predict(feats: dict[str, float]) -> tuple[float, str]:
    bundle = load()
    if bundle is None:
        raise FileNotFoundError("dry-spell model not trained yet (run scripts/train_dryspell.py)")
    x = np.array([[feats[f] for f in bundle["features"]]], dtype=float)
    return float(bundle["model"].predict_proba(x)[0, 1]), str(bundle["version"])
