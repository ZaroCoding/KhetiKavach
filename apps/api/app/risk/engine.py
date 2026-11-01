"""Risk engine v1: event probabilities by counting forecast members (ruling B-3).

Events (IMD categories where one exists; others from the runbook):
  dry_spell    >= 10 consecutive days with < 2.5 mm (IMD "rainy day" is >= 2.5 mm)
  heavy_rain   any day >= 20 mm, or any 3-day total >= 50 mm (runbook criteria)
  harvest_rain on ripening days only: any day >= 15.6 mm (IMD "moderate") or 3-day total >= 25 mm
Probability = share of members in which the event happens; with an ensemble we also give a 90%
Wilson interval because 51 members is a sample. Nothing here is fitted: it is counting.
"""

import math
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Any

import numpy as np
from numpy.typing import NDArray

from app.risk.crops import stage_on, stages_in_window
from app.schemas import Severity, Threshold

DRY_DAY_MM = 2.5
DRY_SPELL_DAYS = 10
HEAVY_DAY_MM = 20.0
HEAVY_3DAY_MM = 50.0
HARVEST_DAY_MM = 15.6
HARVEST_3DAY_MM = 25.0

FloatArray = NDArray[np.float64]


@dataclass
class MemberForecast:
    """Daily precipitation per member: members.shape == (n_members, n_days)."""

    model: str
    dates: list[date]
    members: FloatArray
    method: str = "ensemble"  # "ensemble" | "multi_model" | "deterministic_replay"
    source: str = "open_meteo_ensemble"
    provenance: dict[str, Any] = field(default_factory=dict)


@dataclass
class HazardEstimate:
    hazard: str
    exceeding: int
    total: int
    window_start: date
    window_end: date
    stage_names: list[str]
    stage_weight: float
    threshold: Threshold
    notes: list[str]

    @property
    def probability(self) -> float | None:
        return self.exceeding / self.total if self.total else None


def longest_dry_run(daily_mm: FloatArray, thr: float = DRY_DAY_MM) -> int:
    best = cur = 0
    for v in daily_mm:
        if np.isnan(v):
            cur = 0  # a missing day breaks the run: never assume dry
            continue
        cur = cur + 1 if v < thr else 0
        best = max(best, cur)
    return best


def max_rolling_sum(daily_mm: FloatArray, k: int) -> float:
    clean = np.nan_to_num(daily_mm)
    if len(clean) < k:
        return float(clean.sum())
    return float(np.convolve(clean, np.ones(k), mode="valid").max())


def wilson_interval(k: int, n: int, z: float = 1.645) -> tuple[float, float]:
    if n == 0:
        return (0.0, 1.0)
    p = k / n
    denom = 1 + z * z / n
    centre = (p + z * z / (2 * n)) / denom
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / denom
    return (round(max(0.0, centre - half), 3), round(min(1.0, centre + half), 3))


def severity_band(probability: float | None, stage_weight: float) -> Severity:
    if probability is None:
        return "unknown"
    score = probability * stage_weight
    if score >= 0.7:
        return "severe"
    if score >= 0.45:
        return "high"
    if score >= 0.2:
        return "moderate"
    return "low"


def quantile_series(fc: MemberForecast) -> dict[str, list[tuple[date, float]]]:
    """Per-day p10 / p50 / p90 and the share of members with a rainy day, for the spread chart."""
    out: dict[str, list[tuple[date, float]]] = {"p10": [], "p50": [], "p90": [], "wet_share": []}
    for i, d in enumerate(fc.dates):
        col = fc.members[:, i]
        col = col[~np.isnan(col)]
        if col.size == 0:
            continue
        out["p10"].append((d, round(float(np.percentile(col, 10)), 1)))
        out["p50"].append((d, round(float(np.percentile(col, 50)), 1)))
        out["p90"].append((d, round(float(np.percentile(col, 90)), 1)))
        out["wet_share"].append((d, round(float((col >= DRY_DAY_MM).mean()), 2)))
    return out


def estimate_hazards(
    fc: MemberForecast, crop: str, sowing: date, as_of: date
) -> list[HazardEstimate]:
    n_members, n_days = fc.members.shape
    start, end = fc.dates[0], fc.dates[-1]
    stages = stages_in_window(crop, sowing, start, n_days)
    if not stages:
        return []
    names = [s.name for s in stages]
    drought_w = min(1.0, max(s.drought_ky for s in stages))
    rain_w = max(0.5, max(s.rain_sens for s in stages))
    out: list[HazardEstimate] = []

    # A member with fewer than DRY_SPELL_DAYS valid days can never show the event, so counting it
    # would drag the probability down (the multi-model fallback has models ending at 7 or 9 days).
    covered = [
        m for m in range(n_members) if int((~np.isnan(fc.members[m])).sum()) >= DRY_SPELL_DAYS
    ]
    runs = np.array([longest_dry_run(fc.members[m]) for m in covered])
    dry_notes = (
        [f"Median longest dry run across members: {int(np.median(runs))} days"] if covered else []
    )
    if len(covered) < n_members:
        dry_notes.append(
            f"{n_members - len(covered)} of {n_members} members cover fewer than "
            f"{DRY_SPELL_DAYS} days and are left out of the dry-spell count"
        )
    out.append(
        HazardEstimate(
            "dry_spell",
            int((runs >= DRY_SPELL_DAYS).sum()),
            len(covered),
            start,
            end,
            names,
            drought_w,
            Threshold(
                description=f">= {DRY_SPELL_DAYS} consecutive days with < {DRY_DAY_MM} mm",
                value=DRY_SPELL_DAYS,
                unit="days",
            ),
            dry_notes,
        )
    )

    heavy = [
        bool(
            np.nanmax(fc.members[m]) >= HEAVY_DAY_MM
            or max_rolling_sum(fc.members[m], 3) >= HEAVY_3DAY_MM
        )
        for m in range(n_members)
    ]
    wettest = float(np.median(np.nanmax(fc.members, axis=1)))
    out.append(
        HazardEstimate(
            "heavy_rain",
            int(sum(heavy)),
            n_members,
            start,
            end,
            names,
            rain_w,
            Threshold(
                description=f"any day >= {HEAVY_DAY_MM:g} mm or any 3-day total >= "
                f"{HEAVY_3DAY_MM:g} mm",
                value=HEAVY_DAY_MM,
                unit="mm/day",
            ),
            [f"Wettest single day, median across members: {wettest:.1f} mm"],
        )
    )

    ripe = [
        i
        for i in range(n_days)
        if (st := stage_on(crop, sowing, start + timedelta(days=i)).stage) and st.name == "ripening"
    ]
    if ripe:
        sub = fc.members[:, ripe]
        hit = [
            bool(
                np.nanmax(sub[m]) >= HARVEST_DAY_MM or max_rolling_sum(sub[m], 3) >= HARVEST_3DAY_MM
            )
            for m in range(n_members)
        ]
        out.append(
            HazardEstimate(
                "harvest_rain",
                int(sum(hit)),
                n_members,
                fc.dates[ripe[0]],
                fc.dates[ripe[-1]],
                ["ripening"],
                1.0,
                Threshold(
                    description=f"ripening days: any day >= {HARVEST_DAY_MM} mm or 3-day total "
                    f">= {HARVEST_3DAY_MM:g} mm",
                    value=HARVEST_DAY_MM,
                    unit="mm/day",
                ),
                [],
            )
        )
    return out
