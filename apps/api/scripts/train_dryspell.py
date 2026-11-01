"""Train and evaluate the LightGBM dry-spell model on IMD gridded rainfall.

Target : >= 10 consecutive days < 2.5 mm within the 15 days starting at t.
Inputs : only rain observed before t (see app/risk/model.py FEATURES), plus 1951-2000 climatology.
Split  : train 1951-2005 | validate 2006-2012 (early stopping)
         | TEST 2013-2022 (held out, reported).
         2023 is never seen, so Time Machine replays of 2023 are out-of-sample.
Season : samples every 5 days, June-October (kharif) and February-April (rabi grain
         filling and harvest).
Baseline: the climatological probability for that cell and day-of-year (clim_p_dry).
Writes  : models/dryspell_lgbm.joblib and models/dryspell_metrics.json.
          Report the numbers exactly as written.

Usage: uv run python -m scripts.train_dryspell
"""

import asyncio
import json
from datetime import date, timedelta
from pathlib import Path

import asyncpg
import joblib
import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.calibration import calibration_curve
from sklearn.metrics import brier_score_loss, roc_auc_score

from app import db
from app.risk.engine import DRY_SPELL_DAYS, longest_dry_run
from app.risk.model import FEATURES, features_from_series

SEASON_MONTHS = {2, 3, 4, 6, 7, 8, 9, 10}
VERSION = "dryspell-lgbm-v1"


def build_samples(cell_df: pd.DataFrame, lat: float, lon: float) -> list[dict[str, float]]:
    s = cell_df.set_index("date")["mm"].clip(lower=0)
    s.index = pd.to_datetime(s.index)
    s = s.asfreq("D")
    # Climatology from 1951-2000 only: probability of the event for each day-of-year (+/-7 d window)
    clim_years = s["1951":"2000"]
    events = {}
    for t in clim_years.index[::1]:
        nxt = s[t : t + timedelta(days=14)].to_numpy()
        if len(nxt) == 15 and not np.isnan(nxt).any():
            events.setdefault(t.dayofyear, []).append(longest_dry_run(nxt) >= DRY_SPELL_DAYS)
    clim = {}
    for doy in range(1, 367):
        pool = [e for d in range(doy - 7, doy + 8) for e in events.get((d - 1) % 366 + 1, [])]
        clim[doy] = float(np.mean(pool)) if pool else np.nan
    rows = []
    for t in s.index[60::5]:
        if t.month not in SEASON_MONTHS or t.year > 2022:
            continue
        past = s[t - timedelta(days=60) : t - timedelta(days=1)].to_numpy()
        nxt = s[t : t + timedelta(days=14)].to_numpy()
        if len(past) != 60 or len(nxt) != 15 or np.isnan(past).any() or np.isnan(nxt).any():
            continue
        cp = clim.get(t.dayofyear, np.nan)
        if np.isnan(cp):
            continue
        f = features_from_series(list(past), t.date(), cp, lat, lon)
        f["y"] = int(longest_dry_run(nxt) >= DRY_SPELL_DAYS)
        f["year"] = t.year
        rows.append(f)
    return rows


def brier_skill(y: object, p: object, p_ref: object) -> float:
    return 1 - brier_score_loss(y, p) / brier_score_loss(y, p_ref)


async def main() -> None:
    conn = await asyncpg.connect(db._dsn())
    cells = await conn.fetch("SELECT lat, lon FROM imd_cells ORDER BY random() LIMIT 120")
    rows = []
    for c in cells:
        df = pd.DataFrame(
            await conn.fetch(
                "SELECT date, mm FROM imd_rain_daily WHERE lat=$1 AND lon=$2 ORDER BY date",
                c["lat"],
                c["lon"],
            ),
            columns=["date", "mm"],
        )
        rows += build_samples(df, c["lat"], c["lon"])
        print(f"cell {c['lat']},{c['lon']}: total samples {len(rows):,}")
    await conn.close()
    data = pd.DataFrame(rows)
    train, val, test = (
        data[data.year <= 2005],
        data[(data.year >= 2006) & (data.year <= 2012)],
        data[(data.year >= 2013) & (data.year <= 2022)],
    )
    model = lgb.LGBMClassifier(
        n_estimators=2000,
        learning_rate=0.03,
        num_leaves=31,
        min_child_samples=50,
        subsample=0.8,
        subsample_freq=1,
        colsample_bytree=0.8,
        verbose=-1,
    )
    model.fit(
        train[FEATURES],
        train.y,
        eval_set=[(val[FEATURES], val.y)],
        eval_metric="binary_logloss",
        callbacks=[lgb.early_stopping(100, verbose=False)],
    )
    p = model.predict_proba(test[FEATURES])[:, 1]
    frac, mean_pred = calibration_curve(test.y, p, n_bins=10, strategy="quantile")
    metrics = {
        "version": VERSION,
        "trained_on": str(date.today()),
        "target": f">= {DRY_SPELL_DAYS} consecutive days < 2.5 mm in the next 15 days",
        "train_period": "1951-2005",
        "val_period": "2006-2012",
        "test_period": "2013-2022",
        "n_cells": len(cells),
        "n_train": int(len(train)),
        "n_test": int(len(test)),
        "test_event_rate": round(float(test.y.mean()), 4),
        "brier_model": round(float(brier_score_loss(test.y, p)), 4),
        "brier_climatology": round(float(brier_score_loss(test.y, test.clim_p_dry)), 4),
        "brier_skill_score_vs_climatology": round(
            float(brier_skill(test.y, p, test.clim_p_dry)), 4
        ),
        "roc_auc_model": round(float(roc_auc_score(test.y, p)), 4),
        "roc_auc_climatology": round(float(roc_auc_score(test.y, test.clim_p_dry)), 4),
        "reliability": [
            {"mean_predicted": round(float(m), 3), "observed_freq": round(float(f), 3)}
            for m, f in zip(mean_pred, frac, strict=True)
        ],
        "best_iteration": int(model.best_iteration_ or model.n_estimators),
        "adopted": None,
    }
    # Adopt only if it beats climatology on the held-out period. Otherwise say so in the UI.
    metrics["adopted"] = metrics["brier_skill_score_vs_climatology"] > 0
    save(model, metrics)


def save(model: object, metrics: dict[str, object]) -> None:
    """Write the model bundle and its metrics file (synchronous file IO, outside the event loop)."""
    Path("models").mkdir(exist_ok=True)
    joblib.dump(
        {"model": model, "features": FEATURES, "version": VERSION}, "models/dryspell_lgbm.joblib"
    )
    Path("models/dryspell_metrics.json").write_text(json.dumps(metrics, indent=2))
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
