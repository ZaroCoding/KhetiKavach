"""IMD 0.25 deg gridded daily rainfall (1901+), pre-loaded by scripts/load_imd.py.

Gives the climatological baseline for the same window: how often each event happened at this grid
cell in 1991-2020. That is the "usual chance" shown next to every forecast probability.
"""

from dataclasses import dataclass
from datetime import date, timedelta

import numpy as np

from app import db
from app.risk.engine import (
    DRY_SPELL_DAYS,
    HARVEST_3DAY_MM,
    HARVEST_DAY_MM,
    HEAVY_3DAY_MM,
    HEAVY_DAY_MM,
    longest_dry_run,
    max_rolling_sum,
)


@dataclass
class Climatology:
    lat: float
    lon: float
    years: str
    n_years: int
    normal_total_mm: float
    p_dry_spell: float
    p_heavy_rain: float
    p_harvest_rain: float


async def nearest_cell(lat: float, lon: float) -> tuple[float, float] | None:
    row = await db.pool().fetchrow(
        """SELECT lat, lon FROM imd_cells
           WHERE lat BETWEEN $1 - 0.3 AND $1 + 0.3 AND lon BETWEEN $2 - 0.3 AND $2 + 0.3
           ORDER BY (lat - $1) ^ 2 + (lon - $2) ^ 2 LIMIT 1""",
        lat,
        lon,
    )
    return (float(row["lat"]), float(row["lon"])) if row else None


def _window_start(start: date, year: int) -> date:
    try:
        return start.replace(year=year)
    except ValueError:  # 29 February
        return start.replace(year=year, day=28)


async def window_climatology(
    lat: float, lon: float, start: date, days: int, years: tuple[int, int] = (1991, 2020)
) -> Climatology:
    cell = await nearest_cell(lat, lon)
    if not cell:
        raise LookupError("no IMD grid cell loaded near this field (run scripts/load_imd.py)")
    rows = await db.pool().fetch(
        """SELECT date, mm FROM imd_rain_daily WHERE lat = $1 AND lon = $2
           AND EXTRACT(year FROM date) BETWEEN $3 AND $4""",
        cell[0],
        cell[1],
        years[0],
        years[1],
    )
    by_date = {r["date"]: float(r["mm"]) for r in rows}
    totals: list[float] = []
    dry = heavy = harvest = 0
    for y in range(years[0], years[1] + 1):
        s = _window_start(start, y)
        vals = [by_date.get(s + timedelta(days=i)) for i in range(days)]
        if any(v is None or v < 0 for v in vals):
            continue  # incomplete or missing (-999) years are skipped, never filled
        arr = np.array(vals, dtype=float)
        totals.append(float(arr.sum()))
        dry += longest_dry_run(arr) >= DRY_SPELL_DAYS
        heavy += bool(arr.max() >= HEAVY_DAY_MM or max_rolling_sum(arr, 3) >= HEAVY_3DAY_MM)
        harvest += bool(arr.max() >= HARVEST_DAY_MM or max_rolling_sum(arr, 3) >= HARVEST_3DAY_MM)
    n = len(totals)
    if n == 0:
        raise LookupError("IMD history incomplete for this window")
    return Climatology(
        cell[0],
        cell[1],
        f"{years[0]}-{years[1]}",
        n,
        round(float(np.mean(totals)), 1),
        round(dry / n, 3),
        round(heavy / n, 3),
        round(harvest / n, 3),
    )


async def antecedent(
    lat: float, lon: float, as_of: date, days: int = 60
) -> tuple[tuple[float, float], list[float]]:
    """Observed IMD rain for the `days` before `as_of` (inputs of the LightGBM model)."""
    cell = await nearest_cell(lat, lon)
    if not cell:
        raise LookupError("no IMD grid cell loaded near this field")
    rows = await db.pool().fetch(
        """SELECT date, mm FROM imd_rain_daily WHERE lat = $1 AND lon = $2
           AND date >= $3 AND date < $4 ORDER BY date""",
        cell[0],
        cell[1],
        as_of - timedelta(days=days),
        as_of,
    )
    if len(rows) < days - 2:
        raise LookupError(f"IMD data not loaded up to {as_of} for this cell")
    return cell, [max(0.0, float(r["mm"])) for r in rows]
