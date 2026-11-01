"""Open-Meteo connectors (no key, non-commercial, CC BY 4.0).

  Ensemble API     live probabilistic forecast: ECMWF IFS 51 members / 15 days, NOAA GEFS 31 / 10.
  Forecast API     multi-model deterministic fallback; recent rain (past_days); modelled soil.
  Archive API      ERA5-Land: antecedent rain/soil for a past date, soil climatology, and what
                   actually fell after a Time Machine date (display only, never an input).
  Single Runs API  the forecast actually issued on a past date (ECMWF IFS from 2024-03-14).
The Historical Forecast API is deliberately NOT used for replays: it stitches the first hours of
each run into one series, which would leak observed weather into a "forecast".
"""

import re
from collections import defaultdict
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from typing import Any

import numpy as np

from app.config import get_settings
from app.connectors.base import FetchResult, fetch_json
from app.risk.engine import MemberForecast

ENSEMBLE_URL = "https://ensemble-api.open-meteo.com/v1/ensemble"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
SINGLE_RUNS_URL = "https://single-runs-api.open-meteo.com/v1/forecast"
SINGLE_RUNS_FIRST_DATE = date(2024, 3, 14)
TZ = "Asia/Kolkata"
ENSEMBLE_DAYS = {"ecmwf_ifs025": 15, "ncep_gefs025": 10}
DETERMINISTIC_MODELS = [
    "ecmwf_ifs025",
    "gfs_seamless",
    "icon_seamless",
    "gem_seamless",
    "jma_seamless",
]
_MEMBER_RE = re.compile(r"^precipitation(_member\d+)?$")


@dataclass
class Antecedent:
    rain_last_30d_mm: float | None
    rain_series: list[tuple[date, float]]
    soil_moisture_m3m3: float | None
    soil_moisture_percentile: float | None
    soil_climatology_years: str | None
    results: list[FetchResult]


def _round(lat: float, lon: float) -> dict[str, float]:
    return {"latitude": round(lat, 3), "longitude": round(lon, 3)}


def hourly_to_daily_members(hourly: dict[str, Any]) -> tuple[list[date], np.ndarray[Any, Any]]:
    """Sum hourly precipitation into local days per member; keep a day only with >= 20 hours."""
    times = [datetime.fromisoformat(t) for t in hourly["time"]]
    keys = sorted(k for k in hourly if _MEMBER_RE.match(k))
    if not keys:
        raise ValueError("no precipitation members in response")
    days = sorted({t.date() for t in times})
    index = {d: i for i, d in enumerate(days)}
    out = np.full((len(keys), len(days)), np.nan)
    for m, k in enumerate(keys):
        sums: dict[date, float] = defaultdict(float)
        counts: dict[date, int] = defaultdict(int)
        for t, v in zip(times, hourly[k], strict=False):
            if v is not None:
                sums[t.date()] += float(v)
                counts[t.date()] += 1
        for d, total in sums.items():
            if counts[d] >= 20:  # never pad a partial day
                out[m, index[d]] = total
    keep = [i for i in range(len(days)) if not np.all(np.isnan(out[:, i]))]
    return [days[i] for i in keep], out[:, keep]


async def ensemble(lat: float, lon: float, model: str) -> tuple[MemberForecast, FetchResult]:
    params: dict[str, Any] = {
        **_round(lat, lon),
        "hourly": "precipitation",
        "models": model,
        "forecast_days": ENSEMBLE_DAYS.get(model, 10),
        "timezone": TZ,
    }
    res = await fetch_json(
        "open_meteo_ensemble",
        ENSEMBLE_URL,
        params=params,
        ttl_s=3 * 3600,
        timeout_s=get_settings().weather_timeout_s,
    )
    dates, members = hourly_to_daily_members(res.data["hourly"])
    return MemberForecast(model, dates, members, "ensemble", "open_meteo_ensemble"), res


async def multi_model(lat: float, lon: float, days: int = 10) -> tuple[MemberForecast, FetchResult]:
    """Fallback when the ensemble is down: independent deterministic models as 'members'."""
    params: dict[str, Any] = {
        **_round(lat, lon),
        "daily": "precipitation_sum",
        "models": ",".join(DETERMINISTIC_MODELS),
        "forecast_days": days,
        "timezone": TZ,
    }
    res = await fetch_json(
        "open_meteo_forecast",
        FORECAST_URL,
        params=params,
        ttl_s=3 * 3600,
        timeout_s=get_settings().weather_timeout_s,
        cache_discriminator=":multimodel",
    )
    daily = res.data["daily"]
    dates = [date.fromisoformat(t) for t in daily["time"]]
    rows, used = [], []
    for m in DETERMINISTIC_MODELS:
        vals = daily.get(f"precipitation_sum_{m}")
        if vals and any(v is not None for v in vals):
            rows.append([np.nan if v is None else float(v) for v in vals])
            used.append(m)
    if len(rows) < 2:
        raise ValueError("fewer than two deterministic models returned data")
    fc = MemberForecast(
        f"{len(used)} models ({', '.join(used)})",
        dates,
        np.array(rows, dtype=float),
        "multi_model",
        "open_meteo_forecast",
    )
    return fc, res


async def single_run(
    lat: float, lon: float, issued: date, days: int = 10
) -> tuple[MemberForecast, FetchResult]:
    """The ECMWF IFS run actually issued at 00 UTC on `issued` (Time Machine, B-10)."""
    if issued < SINGLE_RUNS_FIRST_DATE:
        raise ValueError(f"no archived model runs before {SINGLE_RUNS_FIRST_DATE}")
    params: dict[str, Any] = {
        **_round(lat, lon),
        "hourly": "precipitation",
        "models": "ecmwf_ifs",
        "run": f"{issued.isoformat()}T00:00",
        "forecast_days": days,
        "timezone": TZ,
    }
    res = await fetch_json(
        "open_meteo_single_runs",
        SINGLE_RUNS_URL,
        params=params,
        ttl_s=365 * 86400,
        timeout_s=get_settings().weather_timeout_s,
    )
    dates, members = hourly_to_daily_members(res.data["hourly"])
    keep = [i for i, d in enumerate(dates) if d >= issued]
    fc = MemberForecast(
        f"ECMWF IFS run {issued.isoformat()} 00 UTC",
        [dates[i] for i in keep],
        members[:, keep],
        "deterministic_replay",
        "open_meteo_single_runs",
    )
    return fc, res


async def recent_conditions(lat: float, lon: float) -> tuple[Antecedent, FetchResult]:
    """Live: rain in the last 30 days and latest modelled soil moisture (forecast API)."""
    params: dict[str, Any] = {
        **_round(lat, lon),
        "daily": "precipitation_sum",
        "hourly": "soil_moisture_9_to_27cm",
        "past_days": 31,
        "forecast_days": 1,
        "timezone": TZ,
    }
    res = await fetch_json(
        "open_meteo_forecast",
        FORECAST_URL,
        params=params,
        ttl_s=3 * 3600,
        timeout_s=get_settings().weather_timeout_s,
        cache_discriminator=":recent",
    )
    today = datetime.now(UTC).date()
    daily = res.data["daily"]
    rain = [
        (date.fromisoformat(d), float(v))
        for d, v in zip(daily["time"], daily["precipitation_sum"], strict=False)
        if v is not None and date.fromisoformat(d) < today
    ][-30:]
    soil = [float(v) for v in res.data["hourly"]["soil_moisture_9_to_27cm"] if v is not None]
    total = round(sum(v for _, v in rain), 1) if len(rain) >= 25 else None
    return Antecedent(total, rain, round(soil[-1], 3) if soil else None, None, None, [res]), res


async def archive_daily(
    lat: float, lon: float, start: date, end: date, hourly: str | None = None
) -> FetchResult:
    params: dict[str, Any] = {
        **_round(lat, lon),
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "daily": "precipitation_sum",
        "timezone": TZ,
        "models": "era5_land",
    }
    if hourly:
        params["hourly"] = hourly
    return await fetch_json(
        "open_meteo_archive",
        ARCHIVE_URL,
        params=params,
        ttl_s=365 * 86400,
        timeout_s=max(get_settings().weather_timeout_s, 15),
    )


async def soil_climatology(
    lat: float, lon: float, on: date, years: int = 10, half_window: int = 15
) -> tuple[list[float], str, FetchResult]:
    """Daily-mean ERA5-Land root-zone soil moisture within +/-15 days of `on`, prior years."""
    first, last = date(on.year - years, 1, 1), date(on.year - 1, 12, 31)
    res = await archive_daily(lat, lon, first, last, hourly="soil_moisture_7_to_28cm")
    h = res.data["hourly"]
    by_day: dict[date, list[float]] = defaultdict(list)
    for t, v in zip(h["time"], h["soil_moisture_7_to_28cm"], strict=False):
        if v is not None:
            by_day[datetime.fromisoformat(t).date()].append(float(v))
    doy = on.timetuple().tm_yday

    def near(d: date) -> bool:
        gap = abs(d.timetuple().tm_yday - doy)
        return min(gap, 365 - gap) <= half_window

    vals = [float(np.mean(v)) for d, v in by_day.items() if near(d)]
    return vals, f"{first.year}-{last.year}", res


async def antecedent_as_of(lat: float, lon: float, as_of: date) -> Antecedent:
    """30-day rain before `as_of` and soil-moisture percentile, all ERA5-Land (leak-free)."""
    end = min(as_of - timedelta(days=1), datetime.now(UTC).date() - timedelta(days=6))
    start = end - timedelta(days=29)
    res = await archive_daily(lat, lon, start, end, hourly="soil_moisture_7_to_28cm")
    d = res.data
    rain = [
        (date.fromisoformat(t), float(v))
        for t, v in zip(d["daily"]["time"], d["daily"]["precipitation_sum"], strict=False)
        if v is not None
    ]
    soil = [float(v) for v in d["hourly"]["soil_moisture_7_to_28cm"] if v is not None]
    sm = round(float(np.mean(soil[-24:])), 3) if soil else None
    out = Antecedent(
        round(sum(v for _, v in rain), 1) if len(rain) >= 25 else None, rain, sm, None, None, [res]
    )
    if sm is not None:
        vals, years, clim_res = await soil_climatology(lat, lon, end)
        if vals:
            out.soil_moisture_percentile = round(float((np.array(vals) < sm).mean() * 100), 0)
            out.soil_climatology_years = years
            out.results.append(clim_res)
    return out


async def observed_after(
    lat: float, lon: float, as_of: date, days: int = 15
) -> tuple[list[tuple[date, float]], FetchResult] | None:
    end = as_of + timedelta(days=days - 1)
    if end > datetime.now(UTC).date() - timedelta(days=6):
        return None
    res = await archive_daily(lat, lon, as_of, end)
    daily = res.data["daily"]
    series = [
        (date.fromisoformat(t), float(v))
        for t, v in zip(daily["time"], daily["precipitation_sum"], strict=False)
        if v is not None
    ]
    return series, res
