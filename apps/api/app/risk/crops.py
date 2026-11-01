"""Crop calendars and stage sensitivities for the four contract crops (ruling B-19).

This is configuration, so each value names its source. VERIFY ON DAY 0:
  * drought_ky: FAO Irrigation & Drainage Paper 33 (Doorenbos & Kassam, 1979), Table 2, yield
    response factor Ky by growth period. Rice is not listed by stage there: marked "team-set".
  * stage days: FAO-56 (Allen et al., 1998) Table 11 (L_ini / L_dev / L_mid / L_late), India or
    tropical rows where listed; mid-season is split into flowering (first 40%) and yield formation.
  * rain_sens: team-set weights for damage from rain on a ripening crop (lodging, sprouting, boll
    rot). Say "team-set" on the slide; do not present them as published coefficients.
"""

from dataclasses import dataclass
from datetime import date, timedelta


@dataclass(frozen=True)
class Stage:
    name: str
    start_das: int  # days after sowing, inclusive
    end_das: int  # exclusive
    drought_ky: float
    rain_sens: float


@dataclass(frozen=True)
class CropProfile:
    crop: str
    stages: tuple[Stage, ...]
    source: str


STAGE_NAMES = ("establishment", "vegetative", "flowering", "yield_formation", "ripening")


def _profile(
    crop: str,
    lengths: tuple[int, int, int, int],
    ky: tuple[float, float, float, float, float],
    source: str,
    rain: tuple[float, float, float, float, float] = (0.1, 0.2, 0.4, 0.6, 1.0),
) -> CropProfile:
    ini, dev, mid, late = lengths
    flower = round(mid * 0.4)
    bounds = [0, ini, ini + dev, ini + dev + flower, ini + dev + mid, ini + dev + mid + late]
    stages = tuple(
        Stage(name, bounds[i], bounds[i + 1], ky[i], rain[i]) for i, name in enumerate(STAGE_NAMES)
    )
    return CropProfile(crop, stages, source)


FAO33 = "FAO-33 Table 2 (Ky by stage); FAO-56 Table 11 stage lengths"
TEAM = "team-set Ky (not listed by stage in FAO-33); FAO-56 Table 11 stage lengths"

CROPS: dict[str, CropProfile] = {
    # ky order: establishment, vegetative, flowering, yield_formation, ripening
    "wheat": _profile("wheat", (20, 25, 60, 30), (0.2, 0.2, 0.6, 0.5, 0.1), FAO33),
    "soybean": _profile("soybean", (20, 30, 40, 20), (0.2, 0.2, 0.8, 1.0, 0.2), FAO33),
    "cotton": _profile("cotton", (30, 50, 55, 45), (0.2, 0.2, 0.5, 0.25, 0.1), FAO33),
    "rice": _profile("rice", (30, 30, 60, 30), (0.6, 0.6, 1.0, 0.8, 0.2), TEAM),
}


@dataclass(frozen=True)
class StageInfo:
    das: int
    stage: Stage | None
    status: str  # "pre_sowing" | "in_season" | "past_maturity"

    @property
    def name(self) -> str:
        return self.stage.name if self.stage else self.status


def stage_on(crop: str, sowing: date, on: date) -> StageInfo:
    das = (on - sowing).days
    if das < 0:
        return StageInfo(das, None, "pre_sowing")
    for st in CROPS[crop].stages:
        if st.start_das <= das < st.end_das:
            return StageInfo(das, st, "in_season")
    return StageInfo(das, None, "past_maturity")


def stages_in_window(crop: str, sowing: date, start: date, days: int) -> list[Stage]:
    """Every stage the crop passes through in [start, start + days)."""
    out: list[Stage] = []
    for d in range(days):
        st = stage_on(crop, sowing, start + timedelta(days=d)).stage
        if st and st not in out:
            out.append(st)
    return out
