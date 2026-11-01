"""Agent tools and their fallback chains. Tools are deterministic code: the LLM never fetches data.

A tool returns ToolOutput(data, fetched) where `fetched` is the FetchResult whose provenance
labels the evidence; it raises on failure and the quality gate moves down the chain.
"""

from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import UTC, date, datetime
from typing import Any

from app import db
from app.config import get_settings
from app.connectors import imd, nasa_power, open_meteo, satellite
from app.connectors.base import FetchResult, SourceUnavailable


@dataclass
class ToolOutput:
    data: Any
    fetched: FetchResult | None
    extra: list[FetchResult] = field(default_factory=list)


ToolFn = Callable[[dict[str, Any]], Awaitable[ToolOutput]]


async def ecmwf_ensemble(ctx: dict[str, Any]) -> ToolOutput:
    fc, res = await open_meteo.ensemble(ctx["lat"], ctx["lon"], "ecmwf_ifs025")
    return ToolOutput(fc, res)


async def gefs_ensemble(ctx: dict[str, Any]) -> ToolOutput:
    fc, res = await open_meteo.ensemble(ctx["lat"], ctx["lon"], "ncep_gefs025")
    return ToolOutput(fc, res)


async def multi_model(ctx: dict[str, Any]) -> ToolOutput:
    fc, res = await open_meteo.multi_model(ctx["lat"], ctx["lon"])
    return ToolOutput(fc, res)


async def archived_run(ctx: dict[str, Any]) -> ToolOutput:
    fc, res = await open_meteo.single_run(ctx["lat"], ctx["lon"], ctx["as_of"])
    return ToolOutput(fc, res)


async def s2_sentinel_hub(ctx: dict[str, Any]) -> ToolOutput:
    series, res = await satellite.s2_sentinel_hub(ctx["geometry"], ctx["as_of"])
    return ToolOutput(series, res)


async def s2_planetary(ctx: dict[str, Any]) -> ToolOutput:
    series, res = await satellite.s2_planetary(ctx["geometry"], ctx["as_of"])
    return ToolOutput(series, res)


async def s1_planetary(ctx: dict[str, Any]) -> ToolOutput:
    series, res = await satellite.s1_planetary(ctx["geometry"], ctx["as_of"])
    return ToolOutput(series, res)


async def recent_open_meteo(ctx: dict[str, Any]) -> ToolOutput:
    ante, res = await open_meteo.recent_conditions(ctx["lat"], ctx["lon"])
    return ToolOutput(ante, res)


async def recent_nasa(ctx: dict[str, Any]) -> ToolOutput:
    as_of = None if ctx["live"] else ctx["as_of"]
    ante = await nasa_power.recent_rain(ctx["lat"], ctx["lon"], as_of)
    return ToolOutput(ante, ante.results[0])


async def antecedent_era5(ctx: dict[str, Any]) -> ToolOutput:
    ante = await open_meteo.antecedent_as_of(ctx["lat"], ctx["lon"], ctx["as_of"])
    return ToolOutput(ante, ante.results[0], ante.results[1:])


async def soil_era5(ctx: dict[str, Any]) -> ToolOutput:
    ante = await open_meteo.antecedent_as_of(ctx["lat"], ctx["lon"], ctx["as_of"])
    return ToolOutput(ante, ante.results[-1])


async def sensor_latest(ctx: dict[str, Any]) -> ToolOutput:
    row = await db.pool().fetchrow(
        """SELECT ts, soil_moisture_pct, temp_c, rh_pct FROM sensor_readings
           WHERE field_id = $1::uuid AND ts > now() - interval '24 hours'
           ORDER BY ts DESC LIMIT 1""",
        ctx["field_id"],
    )
    if not row:
        raise SourceUnavailable("esp32_sensor", "no in-field sensor reading in the last 24 h")
    fetched = FetchResult("esp32_sensor", dict(row), "live", row["ts"], "/api/sensors/ingest")
    return ToolOutput(dict(row), fetched)


async def climatology_imd(ctx: dict[str, Any]) -> ToolOutput:
    clim = await imd.window_climatology(ctx["lat"], ctx["lon"], ctx["as_of"], 15)
    return ToolOutput(clim, None)


async def model_inputs_imd(ctx: dict[str, Any]) -> ToolOutput:
    cell, rain = await imd.antecedent(ctx["lat"], ctx["lon"], ctx["as_of"], days=60)
    clim = await imd.window_climatology(cell[0], cell[1], ctx["as_of"], 15, years=(1951, 2000))
    return ToolOutput({"cell": cell, "rain": rain, "clim_p_dry": clim.p_dry_spell}, None)


async def observed_after(ctx: dict[str, Any]) -> ToolOutput:
    out = await open_meteo.observed_after(ctx["lat"], ctx["lon"], ctx["as_of"])
    if out is None:
        raise SourceUnavailable("open_meteo_archive", "window not yet in the ERA5-Land archive")
    return ToolOutput(out[0], out[1])


REGISTRY: dict[str, ToolFn] = {
    "ecmwf_ensemble": ecmwf_ensemble,
    "gefs_ensemble": gefs_ensemble,
    "multi_model": multi_model,
    "archived_run": archived_run,
    "s2_sentinel_hub": s2_sentinel_hub,
    "s2_planetary": s2_planetary,
    "s1_planetary": s1_planetary,
    "recent_open_meteo": recent_open_meteo,
    "recent_nasa": recent_nasa,
    "antecedent_era5": antecedent_era5,
    "soil_era5": soil_era5,
    "sensor": sensor_latest,
    "climatology_imd": climatology_imd,
    "model_inputs_imd": model_inputs_imd,
    "observed_after": observed_after,
}

# The SourceName each tool reads (used in trace details and unavailable evidence).
TOOL_SOURCE: dict[str, str] = {
    "ecmwf_ensemble": "open_meteo_ensemble",
    "gefs_ensemble": "open_meteo_ensemble",
    "multi_model": "open_meteo_forecast",
    "archived_run": "open_meteo_single_runs",
    "s2_sentinel_hub": "sentinel_hub",
    "s2_planetary": "planetary_computer_s2",
    "s1_planetary": "planetary_computer_s1",
    "recent_open_meteo": "open_meteo_forecast",
    "recent_nasa": "nasa_power",
    "antecedent_era5": "open_meteo_archive",
    "soil_era5": "open_meteo_archive",
    "sensor": "esp32_sensor",
    "climatology_imd": "imd_gridded",
    "model_inputs_imd": "imd_gridded",
    "observed_after": "open_meteo_archive",
}

REASONS = {
    "forecast": "event probabilities need the forecast distribution",
    "cross_check": "a second ensemble (NOAA GEFS) checks the ECMWF signal",
    "optical": "crop condition now vs this field's own 2017+ history",
    "radar": "monsoon month: optical is often cloud-blind, radar is not",
    "antecedent": "recent rain decides how fast a dry spell hurts",
    "soil": "root-zone moisture percentile for this time of year",
    "sensor": "in-field probe, if one is registered",
    "climatology": "IMD 1991-2020 frequency: is this forecast unusual?",
    "model_inputs": "observed IMD rain for the leak-free LightGBM model",
    "observed_after": "what actually fell afterwards (display only, never an input)",
}


def chains_for(mode: str, month: int) -> dict[str, list[str]]:
    """The plan: which tools run, and in what fallback order."""
    optical = ["s2_sentinel_hub", "s2_planetary"]
    if get_settings().satellite_primary == "planetary_computer_s2":
        optical.reverse()
    chains: dict[str, list[str]] = {"optical": optical, "climatology": ["climatology_imd"]}
    if mode == "live":
        chains |= {
            "forecast": ["ecmwf_ensemble", "gefs_ensemble", "multi_model"],
            "cross_check": ["gefs_ensemble"],
            "antecedent": ["recent_open_meteo", "recent_nasa"],
            "soil": ["soil_era5"],
            "sensor": ["sensor"],
        }
    elif mode == "archived_forecast":
        chains |= {
            "forecast": ["archived_run"],
            "antecedent": ["antecedent_era5", "recent_nasa"],
            "observed_after": ["observed_after"],
        }
    else:  # observed_rain_model
        chains |= {
            "model_inputs": ["model_inputs_imd"],
            "antecedent": ["antecedent_era5", "recent_nasa"],
            "observed_after": ["observed_after"],
        }
    if 6 <= month <= 9:
        chains["radar"] = ["s1_planetary"]
    return chains


def utcnow() -> datetime:
    return datetime.now(UTC)


def today_utc() -> date:
    return datetime.now(UTC).date()
