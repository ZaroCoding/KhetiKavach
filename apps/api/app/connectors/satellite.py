"""Sentinel-2 / Sentinel-1 statistics for one field.

Optical series, two interchangeable sources (the agent's fallback chain picks the order):
  sentinel_hub           Copernicus Data Space Statistical API. Index maths and cloud masking run
                         server-side, one small request per year from 2017.
  planetary_computer_s2  STAC search + windowed COG reads of only the field's pixels. No key.
                         History limited to the same season in prior years to bound the reads.
Radar: Sentinel-1 RTC on Planetary Computer (planetary_computer_s1), sees through cloud.

Observation dicts: {"date", "ndvi", "ndmi", "cloud_frac"}. NDMI = (B08-B11)/(B08+B11), Gao's NDWI:
canopy water content. McFeeters' green/NIR NDWI measures open water, so it is not used.
"""

import asyncio
import logging
import math
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace
from datetime import date, timedelta
from typing import Any

import numpy as np

from app.config import get_settings
from app.connectors.base import (
    FetchResult,
    SourceUnavailable,
    client,
    fetch_computed,
    fetch_json,
    is_disabled,
)

log = logging.getLogger("satellite")
_pool = ThreadPoolExecutor(max_workers=3)  # each worker holds raster windows in a 512 MB API
Obs = dict[str, Any]

# SCL classes treated as unusable: 0 no data, 1 saturated, 3 cloud shadow, 8/9 cloud, 10 cirrus,
# 11 snow.
BAD_SCL = (0, 1, 3, 8, 9, 10, 11)

CDSE_TOKEN_URL = (
    "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
)
CDSE_STATS_URL = "https://sh.dataspace.copernicus.eu/api/v1/statistics"
PC_STAC = "https://planetarycomputer.microsoft.com/api/stac/v1"
_token: dict[str, Any] = {"value": None, "exp": 0.0}

EVALSCRIPT_S2 = """//VERSION=3
function setup() {
  return {input: [{bands: ["B04", "B08", "B11", "SCL", "dataMask"]}],
          output: [{id: "ndvi", bands: 1, sampleType: "FLOAT32"},
                   {id: "ndmi", bands: 1, sampleType: "FLOAT32"},
                   {id: "dataMask", bands: 1}]};
}
function evaluatePixel(s) {
  var bad = [0, 1, 3, 8, 9, 10, 11].indexOf(s.SCL) >= 0;
  var valid = (s.dataMask === 1 && !bad) ? 1 : 0;
  return {ndvi: [index(s.B08, s.B04)], ndmi: [index(s.B08, s.B11)], dataMask: [valid]};
}"""


# ============================================================ Sentinel Hub (Copernicus Data Space)
async def _cdse_token() -> str:
    s = get_settings()
    if not (s.cdse_client_id and s.cdse_client_secret):
        raise SourceUnavailable("sentinel_hub", "CDSE_CLIENT_ID / CDSE_CLIENT_SECRET not set")
    if _token["value"] and _token["exp"] > time.time() + 60:
        return str(_token["value"])
    resp = await client().post(
        CDSE_TOKEN_URL,
        timeout=10,
        data={
            "grant_type": "client_credentials",
            "client_id": s.cdse_client_id,
            "client_secret": s.cdse_client_secret,
        },
    )
    resp.raise_for_status()
    body = resp.json()
    _token.update(value=body["access_token"], exp=time.time() + float(body.get("expires_in", 600)))
    return str(_token["value"])


def parse_statistics(payload: dict[str, Any]) -> list[Obs]:
    """Statistical API response to observations; intervals with no valid pixel are dropped."""
    out: list[Obs] = []
    for item in payload.get("data", []):
        try:
            nd = item["outputs"]["ndvi"]["bands"]["B0"]["stats"]
            nm = item["outputs"]["ndmi"]["bands"]["B0"]["stats"]
        except KeyError:
            continue
        total = nd.get("sampleCount") or 0
        nodata = nd.get("noDataCount") or 0
        mean = nd.get("mean")
        if (
            not total
            or nodata >= total
            or mean is None
            or (isinstance(mean, float) and math.isnan(mean))
        ):
            continue
        out.append(
            {
                "date": item["interval"]["from"][:10],
                "ndvi": round(float(mean), 4),
                "ndmi": round(float(nm["mean"]), 4),
                "cloud_frac": round(nodata / total, 3),
            }
        )
    return out


async def s2_sentinel_hub(
    geom: dict[str, Any], as_of: date, first_year: int = 2017
) -> tuple[list[Obs], FetchResult]:
    # A source switched off by the admin must not even ask for a token: fetch_json then serves the
    # last real response (with a note) or raises, and no request leaves the building.
    token = None if await is_disabled("sentinel_hub") else await _cdse_token()

    async def year(y: int) -> FetchResult:
        start, end = date(y, 1, 1), min(date(y, 12, 31), as_of)
        body = {
            "input": {
                "bounds": {
                    "geometry": geom,
                    "properties": {"crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"},
                },
                "data": [{"type": "sentinel-2-l2a", "dataFilter": {"maxCloudCoverage": 90}}],
            },
            "aggregation": {
                "timeRange": {"from": f"{start}T00:00:00Z", "to": f"{end}T23:59:59Z"},
                "aggregationInterval": {"of": "P1D"},
                "evalscript": EVALSCRIPT_S2,
                "resx": 0.00009,
                "resy": 0.00009,
            },
            "calculations": {"default": {}},
        }
        recent = (as_of - end).days < 30
        return await fetch_json(
            "sentinel_hub",
            CDSE_STATS_URL,
            method="POST",
            json_body=body,
            headers={"Authorization": f"Bearer {token}"} if token else None,
            ttl_s=6 * 3600 if recent else 365 * 86400,
            timeout_s=get_settings().imagery_timeout_s,
        )

    results = await asyncio.gather(
        *(year(y) for y in range(first_year, as_of.year + 1)), return_exceptions=True
    )
    series: list[Obs] = []
    good: list[FetchResult] = []
    for r in results:
        if isinstance(r, FetchResult):
            series.extend(parse_statistics(r.data))
            good.append(r)
        else:
            log.warning("sentinel_hub year failed: %s", r)
    if not series or not good:
        raise SourceUnavailable("sentinel_hub", "no usable Sentinel-2 observations returned")
    series.sort(key=lambda o: str(o["date"]))
    newest = max(good, key=lambda r: r.fetched_at)
    return series, newest


# ============================================================ Planetary Computer (STAC + COGs)
def _pc_search(
    collection: str,
    geom: dict[str, Any],
    start: date,
    end: date,
    query: dict[str, Any] | None,
    limit: int,
) -> list[Any]:
    import planetary_computer
    import pystac_client

    cat = pystac_client.Client.open(PC_STAC, modifier=planetary_computer.sign_inplace)
    search = cat.search(
        collections=[collection],
        intersects=geom,
        datetime=f"{start.isoformat()}/{end.isoformat()}",
        query=query,
        max_items=limit,
    )
    return list(search.items())


def _read_field(href: str, geom: dict[str, Any], ref: Any = None) -> tuple[Any, Any, Any]:
    """Read only the field's pixels; `ref` = (crs, transform, shape) to resample onto 10 m."""
    import rasterio
    from rasterio.enums import Resampling
    from rasterio.features import geometry_mask, geometry_window
    from rasterio.vrt import WarpedVRT
    from rasterio.warp import transform_geom

    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", GDAL_HTTP_MAX_RETRY="2"):
        with rasterio.open(href) as src:
            if ref is None:
                g = transform_geom("EPSG:4326", src.crs, geom)
                win = geometry_window(src, [g], pad_x=1, pad_y=1)
                arr = src.read(1, window=win).astype("float32")
                tr = src.window_transform(win)
                inside = geometry_mask([g], out_shape=arr.shape, transform=tr, invert=True)
                return arr, inside, (src.crs, tr, arr.shape)
            crs, tr, shape = ref
            with WarpedVRT(
                src,
                crs=crs,
                transform=tr,
                width=shape[1],
                height=shape[0],
                resampling=Resampling.nearest,
            ) as vrt:
                return vrt.read(1).astype("float32"), None, ref


def _plausible_digital_numbers(*bands: Any) -> bool:
    """Real L2A digital numbers rise far above 255 over land (the NIR band alone reaches
    thousands). A scene whose clear pixels all sit at or below 255 is a corrupt file: Planetary
    Computer served the newest scenes this way on 2026-10-28/29, giving NDVI near 0 and cloud 0 over
    green fields, which would have counted as the latest clear scene."""
    return any(float(np.max(band)) > 255 for band in bands)


def dedupe_by_date(series: list[Obs]) -> list[Obs]:
    """Neighbouring tiles overlap, so one field can have two scenes on the same day. Keep the one
    with real values and the least cloud."""
    best: dict[str, Obs] = {}
    for obs in series:
        key = str(obs["date"])
        rank = (obs.get("ndvi") is None, float(obs["cloud_frac"]))
        if key not in best or rank < (
            best[key].get("ndvi") is None,
            float(best[key]["cloud_frac"]),
        ):
            best[key] = obs
    return sorted(best.values(), key=lambda o: str(o["date"]))


def _s2_item_stats(item: Any, geom: dict[str, Any]) -> Obs | None:
    baseline = float(item.properties.get("s2:processing_baseline", "0") or 0)
    offset = -1000.0 if baseline >= 4.0 else 0.0  # L2A BOA_ADD_OFFSET from baseline 04.00 (2022)
    red, inside, ref = _read_field(item.assets["B04"].href, geom)
    nir, _, _ = _read_field(item.assets["B08"].href, geom, ref)
    swir, _, _ = _read_field(item.assets["B11"].href, geom, ref)
    scl, _, _ = _read_field(item.assets["SCL"].href, geom, ref)
    n_inside = int(inside.sum())
    if n_inside == 0:
        return None
    clear = inside & ~np.isin(scl, BAD_SCL)
    cloud = round(float(1 - clear.sum() / n_inside), 3)
    day = item.datetime.date().isoformat()
    if clear.sum() < 3:
        return {"date": day, "ndvi": None, "ndmi": None, "cloud_frac": cloud}
    if not _plausible_digital_numbers(red[clear], nir[clear], swir[clear]):
        log.warning("dropping scene %s: band values squeezed into 0-255", item.id)
        return None  # a corrupt file is dropped, never scored as a "clear" scene
    r, n, s = ((band[clear] + offset) / 10000.0 for band in (red, nir, swir))
    with np.errstate(divide="ignore", invalid="ignore"):
        ndvi = float(np.nanmean((n - r) / (n + r)))
        ndmi = float(np.nanmean((n - s) / (n + s)))
    return {"date": day, "ndvi": round(ndvi, 4), "ndmi": round(ndmi, 4), "cloud_frac": cloud}


async def _s2_window(geom: dict[str, Any], start: date, end: date, ttl_s: int) -> FetchResult:
    """Observations for one date window, cached on their own so a retry resumes where it stopped."""

    async def work() -> list[Obs]:
        loop = asyncio.get_running_loop()
        items = await loop.run_in_executor(
            _pool,
            _pc_search,
            "sentinel-2-l2a",
            geom,
            start,
            end,
            {"eo:cloud_cover": {"lt": 60}},
            40,
        )
        stats = await asyncio.gather(
            *(loop.run_in_executor(_pool, _s2_item_stats, it, geom) for it in items),
            return_exceptions=True,
        )
        return [s for s in stats if isinstance(s, dict)]

    return await fetch_computed(
        "planetary_computer_s2",
        {"geom": geom, "start": str(start), "end": str(end)},
        work,
        ttl_s=ttl_s,
        timeout_s=get_settings().imagery_timeout_s * 3,
        request_url=f"{PC_STAC}/search?collections=sentinel-2-l2a&datetime={start}/{end}",
    )


async def s2_planetary(
    geom: dict[str, Any], as_of: date, first_year: int = 2017, half_window: int = 45
) -> tuple[list[Obs], FetchResult]:
    """Current scenes plus the same season in earlier years, read window by window.

    The current window is required. Each earlier season is cached on its own (past scenes never
    change) and read best-effort inside a time budget, two at a time: a slow upstream costs history
    years, which the result's note names, instead of the whole answer.
    """
    current = await _s2_window(geom, as_of - timedelta(days=120), as_of, 6 * 3600)
    windows = []
    for y in range(first_year, as_of.year):
        centre = date(y, as_of.month, min(as_of.day, 28))
        windows.append((centre - timedelta(days=half_window), centre + timedelta(days=half_window)))

    gate = asyncio.Semaphore(2)

    async def season(start: date, end: date) -> FetchResult:
        async with gate:
            return await _s2_window(geom, start, end, 365 * 86400)

    tasks = [asyncio.create_task(season(s, e)) for s, e in windows]
    budget = get_settings().imagery_timeout_s * 4
    try:
        done, pending = await asyncio.wait(tasks, timeout=budget) if tasks else (set(), set())
    finally:  # also when the agent's tool timeout cancels this call
        for task in tasks:
            if not task.done():
                task.cancel()
    series: list[Obs] = list(current.data)
    missing = len(pending)
    for task in done:
        if not task.cancelled() and task.exception() is None:
            series.extend(task.result().data)
        else:
            missing += 1
    series = dedupe_by_date(series)
    if not series:
        raise SourceUnavailable("planetary_computer_s2", "no readable Sentinel-2 scenes")
    note = current.note
    if missing:
        gap = (
            f"{missing} of {len(windows)} earlier-season windows unavailable; anomaly uses the rest"
        )
        note = f"{note}; {gap}" if note else gap
    return series, replace(current, note=note)


def _s1_item_stats(item: Any, geom: dict[str, Any]) -> Obs | None:
    vv, inside, ref = _read_field(item.assets["vv"].href, geom)
    vh, _, _ = _read_field(item.assets["vh"].href, geom, ref)
    ok = inside & (vv > 0) & (vh > 0)
    if ok.sum() < 3:
        return None
    vv_m, vh_m = float(np.mean(vv[ok])), float(np.mean(vh[ok]))
    return {
        "date": item.datetime.date().isoformat(),
        "vv_db": round(10 * math.log10(vv_m), 2),
        "vh_db": round(10 * math.log10(vh_m), 2),
        "rvi": round(4 * vh_m / (vv_m + vh_m), 3),
    }


async def s1_planetary(
    geom: dict[str, Any], as_of: date, days: int = 120
) -> tuple[list[Obs], FetchResult]:
    async def work() -> list[Obs]:
        loop = asyncio.get_running_loop()
        items = await loop.run_in_executor(
            _pool, _pc_search, "sentinel-1-rtc", geom, as_of - timedelta(days=days), as_of, None, 40
        )
        stats = await asyncio.gather(
            *(loop.run_in_executor(_pool, _s1_item_stats, it, geom) for it in items),
            return_exceptions=True,
        )
        series = sorted((s for s in stats if isinstance(s, dict)), key=lambda o: str(o["date"]))
        if not series:
            raise SourceUnavailable("planetary_computer_s1", "no Sentinel-1 RTC scenes for field")
        return series

    res = await fetch_computed(
        "planetary_computer_s1",
        {"geom": geom, "as_of": str(as_of)},
        work,
        ttl_s=6 * 3600,
        timeout_s=get_settings().imagery_timeout_s * 3,
        request_url=f"{PC_STAC}/search?collections=sentinel-1-rtc",
    )
    return list(res.data), res


# ============================================================ derived metrics
def _doy_gap(a: date, b: date) -> int:
    gap = abs(a.timetuple().tm_yday - b.timetuple().tm_yday)
    return min(gap, 365 - gap)


def optical_summary(series: list[Obs], as_of: date, max_cloud: float) -> dict[str, Any]:
    """Latest clear observation, its age, and NDVI anomaly vs the field's own same-date history."""
    dated = [s for s in series if date.fromisoformat(str(s["date"])) <= as_of]
    clear = [s for s in dated if s.get("ndvi") is not None and float(s["cloud_frac"]) <= max_cloud]
    latest_scene = max(dated, key=lambda s: str(s["date"]), default=None)
    if not clear:
        return {"latest_clear": None, "latest_scene": latest_scene}
    latest = clear[-1]
    ld = date.fromisoformat(str(latest["date"]))
    hist = [
        float(s["ndvi"])
        for s in clear
        if date.fromisoformat(str(s["date"])).year < ld.year
        and _doy_gap(date.fromisoformat(str(s["date"])), ld) <= 10
    ]
    out: dict[str, Any] = {
        "latest_clear": latest,
        "latest_scene": latest_scene,
        "age_days": (as_of - ld).days,
        "history_n": len(hist),
    }
    if len(hist) >= 3:
        median = float(np.median(hist))
        out["ndvi_hist_median"] = round(median, 3)
        out["ndvi_anomaly"] = round(float(latest["ndvi"]) - median, 3)
    return out


def season_points(
    series: list[Obs], as_of: date, max_cloud: float, days: int = 150
) -> list[dict[str, Any]]:
    """Clear current-season observations with the field's historical median for that date."""
    clear = [s for s in series if s.get("ndvi") is not None and float(s["cloud_frac"]) <= max_cloud]
    out = []
    for s in clear:
        d = date.fromisoformat(str(s["date"]))
        if as_of - timedelta(days=days) <= d <= as_of:
            hist = [
                float(h["ndvi"])
                for h in clear
                if date.fromisoformat(str(h["date"])).year < d.year
                and _doy_gap(date.fromisoformat(str(h["date"])), d) <= 8
            ]
            out.append(
                {
                    "date": d,
                    "ndvi": float(s["ndvi"]),
                    "ndmi": float(s["ndmi"]),
                    "hist_median": round(float(np.median(hist)), 3) if len(hist) >= 3 else None,
                }
            )
    return out
