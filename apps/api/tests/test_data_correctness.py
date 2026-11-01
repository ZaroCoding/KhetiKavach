"""Fixes found by checking every connector against its live upstream on 2026-11-01.

Every payload here is a hand-built test input whose expected result is derivable by hand; none of it
is upstream data (CLAUDE.md rule 1).
"""

from datetime import UTC, date, datetime, timedelta
from types import SimpleNamespace
from typing import Any

import httpx
import numpy as np
import pytest
import respx

from app.connectors import base, open_meteo, satellite
from app.connectors.base import FetchResult, SourceUnavailable
from app.risk.engine import MemberForecast, estimate_hazards, longest_dry_run


def _hours(start: datetime, n: int) -> list[str]:
    return [(start + timedelta(hours=i)).strftime("%Y-%m-%dT%H:%M") for i in range(n)]


# ---------------------------------------------------------------- Open-Meteo
@respx.mock
async def test_archive_asks_for_the_seamless_model() -> None:
    # ERA5-Land returns no precipitation; the Seamless model does (verified live).
    route = respx.get(open_meteo.ARCHIVE_URL).mock(
        return_value=httpx.Response(
            200, json={"daily": {"time": ["2026-01-01"], "precipitation_sum": [1.5]}}
        )
    )
    res = await open_meteo.archive_daily(30.8, 75.8, date(2026, 1, 1), date(2026, 1, 1))
    assert route.calls.last.request.url.params["models"] == "era5_seamless"
    assert res.data["daily"]["precipitation_sum"] == [1.5]


@respx.mock
async def test_single_run_is_ten_full_utc_days_and_can_see_a_ten_day_dry_spell() -> None:
    issued = date(2025, 12, 1)
    # A preceding-hour sum has no value at the run's own 00:00 label; every later hour is dry.
    body = {
        "hourly": {
            "time": _hours(datetime(2025, 12, 1), 240),
            "precipitation": [None] + [0.0] * 239,
        }
    }
    route = respx.get(open_meteo.SINGLE_RUNS_URL).mock(return_value=httpx.Response(200, json=body))
    fc, _ = await open_meteo.single_run(30.8, 75.8, issued)
    params = route.calls.last.request.url.params
    assert "timezone" not in params  # IST days would leave 18 h + 5 h at the ends and drop both
    assert params["run"] == "2025-12-01T00:00" and params["models"] == "ecmwf_ifs"
    assert fc.members.shape == (1, 10) and fc.dates[0] == issued
    assert longest_dry_run(fc.members[0]) == 10  # a 10-day spell is now visible


@respx.mock
async def test_ensemble_uses_the_documented_model_ids() -> None:
    body = {
        "hourly": {
            "time": _hours(datetime(2026, 11, 1), 48),
            "precipitation": [0.0] * 48,
            "precipitation_member01": [1.0] * 48,
        }
    }
    route = respx.get(open_meteo.ENSEMBLE_URL).mock(return_value=httpx.Response(200, json=body))
    fc, _ = await open_meteo.ensemble(30.8, 75.8, open_meteo.ECMWF_ENSEMBLE)
    params = route.calls.last.request.url.params
    assert params["models"] == "ecmwf_ifs025_ensemble" and params["forecast_days"] == "15"
    assert fc.members.shape == (2, 2)  # control + member01, two full days
    assert float(fc.members[1, 0]) == 24.0  # 24 hours of 1 mm
    assert open_meteo.ENSEMBLE_DAYS[open_meteo.GEFS_ENSEMBLE] == 10


# ---------------------------------------------------------------- risk engine
def _forecast(members: np.ndarray) -> MemberForecast:
    days = [date(2026, 8, 1) + timedelta(days=i) for i in range(members.shape[1])]
    return MemberForecast("test models", days, members, "multi_model", "open_meteo_forecast")


def test_dry_spell_leaves_out_members_that_cannot_reach_ten_days() -> None:
    members = np.full((3, 10), np.nan)
    members[0, :] = 0.0  # dry on all 10 days -> event
    members[1, :] = 0.0
    members[1, 4] = 5.0  # rain on day 5 -> longest dry run 5 -> no event
    members[2, :7] = 0.0  # only 7 days of data: can never show a 10-day spell
    estimates = {
        e.hazard: e
        for e in estimate_hazards(_forecast(members), "soybean", date(2026, 7, 1), date(2026, 8, 1))
    }
    dry = estimates["dry_spell"]
    assert (dry.exceeding, dry.total) == (1, 2)
    assert dry.probability == 0.5
    assert any("1 of 3 members cover fewer than 10 days" in note for note in dry.notes)


def test_dry_spell_probability_is_unknown_when_no_member_reaches_ten_days() -> None:
    estimates = {
        e.hazard: e
        for e in estimate_hazards(
            _forecast(np.zeros((2, 7))), "soybean", date(2026, 7, 1), date(2026, 8, 1)
        )
    }
    assert estimates["dry_spell"].total == 0
    assert estimates["dry_spell"].probability is None


# ---------------------------------------------------------------- satellite
def _item() -> Any:
    return SimpleNamespace(
        id="test-scene",
        properties={"s2:processing_baseline": "05.13"},  # >= 04.00: BOA offset of -1000 applies
        assets={band: SimpleNamespace(href=band) for band in ("B04", "B08", "B11", "SCL")},
        datetime=datetime(2026, 10, 28, 5, 39, tzinfo=UTC),
    )


def _reader(digital_numbers: dict[str, float]) -> Any:
    def read(href: str, geom: Any, ref: Any = None) -> tuple[Any, Any, Any]:
        arr = np.full((3, 3), digital_numbers[href], dtype="float32")
        if ref is None:
            return arr, np.ones((3, 3), dtype=bool), "test-ref"
        return arr, None, ref

    return read


def test_a_normal_scene_is_scored(monkeypatch: pytest.MonkeyPatch) -> None:
    # DN 1500 / 3000 / 2500 minus the 1000 offset: red 0.05, nir 0.20, swir 0.15.
    monkeypatch.setattr(
        satellite, "_read_field", _reader({"B04": 1500, "B08": 3000, "B11": 2500, "SCL": 4})
    )
    obs = satellite._s2_item_stats(_item(), {})
    assert obs is not None
    assert obs["ndvi"] == pytest.approx(0.6, abs=1e-3)  # (0.20 - 0.05) / (0.20 + 0.05)
    assert obs["ndmi"] == pytest.approx(0.1429, abs=1e-3)  # (0.20 - 0.15) / (0.20 + 0.15)
    assert obs["cloud_frac"] == 0.0


def test_a_scene_with_values_squeezed_into_0_255_is_dropped(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # Planetary Computer served the newest scenes like this on 2026-10-28/29.
    monkeypatch.setattr(
        satellite, "_read_field", _reader({"B04": 128, "B08": 127, "B11": 129, "SCL": 4})
    )
    assert satellite._s2_item_stats(_item(), {}) is None


def test_overlapping_tiles_keep_one_scene_per_day() -> None:
    series: list[dict[str, Any]] = [
        {"date": "2026-10-29", "ndvi": 0.2, "ndmi": 0.0, "cloud_frac": 0.2},
        {"date": "2026-10-29", "ndvi": 0.3, "ndmi": 0.0, "cloud_frac": 0.0},
        {"date": "2026-10-27", "ndvi": None, "ndmi": None, "cloud_frac": 1.0},
        {"date": "2026-10-27", "ndvi": 0.1, "ndmi": 0.0, "cloud_frac": 0.5},
    ]
    out = satellite.dedupe_by_date(series)
    assert [(o["date"], o["ndvi"]) for o in out] == [("2026-10-27", 0.1), ("2026-10-29", 0.3)]


@respx.mock
async def test_disabled_sentinel_hub_never_asks_for_a_token(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def disabled(source: str) -> bool:
        return True

    async def no_token() -> str:
        raise AssertionError("a token was requested while the source is switched off")

    monkeypatch.setattr(satellite, "is_disabled", disabled)
    monkeypatch.setattr(base, "is_disabled", disabled)
    monkeypatch.setattr(satellite, "_cdse_token", no_token)
    anything = respx.route().mock(return_value=httpx.Response(500))
    with pytest.raises(SourceUnavailable, match="no usable Sentinel-2"):
        await satellite.s2_sentinel_hub(
            {"type": "Polygon", "coordinates": []}, date(2026, 11, 1), 2026
        )
    assert not anything.called  # nothing left the building


async def test_planetary_history_survives_one_failed_window(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def result(start: date, obs: list[dict[str, Any]]) -> FetchResult:
        return FetchResult(
            "planetary_computer_s2", obs, "live", datetime.now(UTC), f"test://{start}"
        )

    async def window(geom: Any, start: date, end: date, ttl_s: int) -> FetchResult:
        if start.year == 2020:  # the current window (as_of minus 120 days)
            return result(
                start, [{"date": "2020-05-20", "ndvi": 0.4, "ndmi": 0.1, "cloud_frac": 0.0}]
            )
        if start.year == 2018:
            return result(
                start, [{"date": "2018-06-01", "ndvi": 0.5, "ndmi": 0.1, "cloud_frac": 0.1}]
            )
        raise SourceUnavailable("planetary_computer_s2", "slow upstream")  # 2019

    monkeypatch.setattr(satellite, "_s2_window", window)
    series, res = await satellite.s2_planetary({}, date(2020, 6, 1), first_year=2018)
    assert [o["date"] for o in series] == ["2018-06-01", "2020-05-20"]
    assert res.note == "1 of 2 earlier-season windows unavailable; anomaly uses the rest"
    assert res.status == "live"


async def test_planetary_current_window_is_required(monkeypatch: pytest.MonkeyPatch) -> None:
    async def window(geom: Any, start: date, end: date, ttl_s: int) -> FetchResult:
        raise SourceUnavailable("planetary_computer_s2", "no scenes")

    monkeypatch.setattr(satellite, "_s2_window", window)
    with pytest.raises(SourceUnavailable):
        await satellite.s2_planetary({}, date(2020, 6, 1), first_year=2018)
