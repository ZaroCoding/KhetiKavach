"""Connector logic: parsing, aggregation and failure paths (failure simulated with respx)."""

from datetime import date

import httpx
import numpy as np
import pytest
import respx

from app.connectors.base import SourceUnavailable, fetch_json
from app.connectors.nasa_power import parse_power_series
from app.connectors.open_meteo import hourly_to_daily_members
from app.connectors.satellite import parse_statistics


def test_hourly_to_daily_drops_partial_days() -> None:
    test_hourly = {
        "time": [f"2026-08-01T{h:02d}:00" for h in range(24)] + ["2026-08-02T00:00"],
        "precipitation": [1.0] * 24 + [5.0],
        "precipitation_member01": [0.5] * 24 + [5.0],
    }
    days, members = hourly_to_daily_members(test_hourly)
    assert days == [date(2026, 8, 1)]  # the 1-hour day is dropped, never padded
    assert members.shape == (2, 1)
    assert np.allclose(sorted(members[:, 0]), [12.0, 24.0])


def test_power_missing_values_dropped() -> None:
    test_series = {"20260801": 3.5, "20260802": -999.0, "20260803": 0.0}
    assert parse_power_series(test_series) == [(date(2026, 8, 1), 3.5), (date(2026, 8, 3), 0.0)]


def test_statistics_parser_skips_fully_masked_intervals() -> None:
    def interval(day: str, mean: float | None, samples: int, nodata: int) -> dict[str, object]:
        stats = {"mean": mean, "sampleCount": samples, "noDataCount": nodata}
        return {
            "interval": {"from": f"{day}T00:00:00Z"},
            "outputs": {
                "ndvi": {"bands": {"B0": {"stats": stats}}},
                "ndmi": {"bands": {"B0": {"stats": stats}}},
            },
        }

    test_payload = {
        "data": [interval("2026-07-01", 0.5, 100, 20), interval("2026-07-06", None, 100, 100)]
    }
    obs = parse_statistics(test_payload)
    assert len(obs) == 1 and obs[0]["cloud_frac"] == 0.2


@respx.mock
async def test_fetch_retries_then_raises_without_cache() -> None:
    route = respx.get("https://example.test/data").mock(return_value=httpx.Response(429, json={}))
    with pytest.raises(SourceUnavailable):
        await fetch_json("open_meteo_forecast", "https://example.test/data", timeout_s=1)
    assert route.call_count == 2  # one retry with backoff


@respx.mock
async def test_fetch_timeout_is_unavailable() -> None:
    respx.get("https://example.test/slow").mock(side_effect=httpx.ReadTimeout("slow"))
    with pytest.raises(SourceUnavailable, match="ReadTimeout"):
        await fetch_json("nasa_power", "https://example.test/slow", timeout_s=1)


@respx.mock
async def test_disabled_source_with_cache_returns_admin_note(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from datetime import UTC, datetime, timedelta
    from unittest.mock import AsyncMock

    monkeypatch.setattr("app.connectors.base.is_disabled", AsyncMock(return_value=True))
    cached_payload = {
        "response": {"result": "ok"},
        "fetched_at": datetime.now(UTC),
        "expires_at": datetime.now(UTC) + timedelta(days=1),
    }
    monkeypatch.setattr("app.connectors.base._cached", AsyncMock(return_value=cached_payload))
    res = await fetch_json("nominatim", "https://example.test/nominatim", timeout_s=1)
    assert res.status == "cached"
    assert res.note == "source disabled by admin; serving last real response"
    assert res.fell_back_to_cache is True
    assert res.data == {"result": "ok"}


@respx.mock
async def test_disabled_source_without_cache_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    from unittest.mock import AsyncMock

    monkeypatch.setattr("app.connectors.base.is_disabled", AsyncMock(return_value=True))
    monkeypatch.setattr("app.connectors.base._cached", AsyncMock(return_value=None))
    with pytest.raises(SourceUnavailable, match="disabled by admin"):
        await fetch_json("nominatim", "https://example.test/nominatim", timeout_s=1)


@respx.mock
async def test_nominatim_boundary_category_parsed() -> None:
    from app.connectors.nominatim import district_bbox

    respx.get("https://nominatim.openstreetmap.org/search").mock(
        return_value=httpx.Response(
            200,
            json=[
                {
                    "display_name": "Ludhiana, Punjab, India",
                    "category": "boundary",
                    "type": "administrative",
                    "boundingbox": ["30.5", "31.0", "75.3", "76.3"],
                }
            ],
        )
    )
    bbox, res = await district_bbox("Ludhiana district, Punjab, India")
    assert bbox == (75.3, 30.5, 76.3, 31.0)
    assert res.status == "live"
