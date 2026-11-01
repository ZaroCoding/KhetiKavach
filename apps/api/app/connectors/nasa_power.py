"""NASA POWER daily point data (no auth). Fallback for recent rainfall."""

from datetime import UTC, date, datetime, timedelta
from typing import Any

from app.config import get_settings
from app.connectors.base import fetch_json
from app.connectors.open_meteo import Antecedent

URL = "https://power.larc.nasa.gov/api/temporal/daily/point"


def parse_power_series(series: dict[str, float]) -> list[tuple[date, float]]:
    """POWER keys are YYYYMMDD; -999 marks a missing day and is dropped, never filled."""
    out = []
    for key, value in sorted(series.items()):
        if value is None or value <= -900:
            continue
        out.append((date(int(key[:4]), int(key[4:6]), int(key[6:])), float(value)))
    return out


async def recent_rain(lat: float, lon: float, as_of: date | None = None) -> Antecedent:
    end = (as_of or datetime.now(UTC).date()) - timedelta(days=1)
    start = end - timedelta(days=29)
    params: dict[str, Any] = {
        "parameters": "PRECTOTCORR",
        "community": "AG",
        "latitude": round(lat, 3),
        "longitude": round(lon, 3),
        "start": start.strftime("%Y%m%d"),
        "end": end.strftime("%Y%m%d"),
        "format": "JSON",
    }
    res = await fetch_json(
        "nasa_power",
        URL,
        params=params,
        ttl_s=6 * 3600,
        timeout_s=get_settings().weather_timeout_s + 4,
    )
    rain = parse_power_series(res.data["properties"]["parameter"]["PRECTOTCORR"])
    total = round(sum(v for _, v in rain), 1) if len(rain) >= 25 else None
    return Antecedent(total, rain, None, None, None, [res])
