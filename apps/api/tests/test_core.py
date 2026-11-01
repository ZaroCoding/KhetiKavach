"""Logic tests for the deterministic core (CLAUDE.md rule 1: hand-built test inputs whose expected
results are derivable by hand; they live only under tests/)."""

from datetime import date, timedelta

import numpy as np
import pytest

from app.agent import gates
from app.geo.validate import FieldValidationError, check_in_district, validate_polygon
from app.rag import rulebased
from app.rag.verifier import verify_plan
from app.risk.crops import stage_on
from app.risk.engine import (
    MemberForecast,
    estimate_hazards,
    longest_dry_run,
    severity_band,
    wilson_interval,
)

TEST_SQUARE = {
    "type": "Polygon",
    "coordinates": [
        [[75.80, 30.90], [75.803, 30.90], [75.803, 30.903], [75.80, 30.903], [75.80, 30.90]]
    ],
}
TEST_BBOX = (75.5, 30.5, 76.5, 31.5)


def test_valid_polygon_area_and_centroid() -> None:
    v = validate_polygon(TEST_SQUARE)
    assert 5 < v.area_ha < 12
    check_in_district(v, TEST_BBOX, "Test", "Test and Other")


def test_self_intersecting_polygon_rejected_with_reason() -> None:
    bowtie = {
        "type": "Polygon",
        "coordinates": [
            [[75.80, 30.90], [75.803, 30.903], [75.803, 30.90], [75.80, 30.903], [75.80, 30.90]]
        ],
    }
    with pytest.raises(FieldValidationError, match="crossing edges"):
        validate_polygon(bowtie)


def test_centroid_outside_district_names_indexed_districts() -> None:
    v = validate_polygon(TEST_SQUARE)
    with pytest.raises(FieldValidationError, match="Ludhiana and Dharwad"):
        check_in_district(v, (70.0, 20.0, 71.0, 21.0), "Ludhiana", "Ludhiana and Dharwad")


def test_wheat_stage_boundaries() -> None:
    sown = date(2025, 11, 10)
    assert stage_on("wheat", sown, sown + timedelta(days=5)).name == "establishment"
    assert stage_on("wheat", sown, date(2026, 3, 20)).name == "ripening"
    assert stage_on("wheat", sown, date(2026, 6, 1)).status == "past_maturity"


def _test_forecast(members: np.ndarray, start: date) -> MemberForecast:
    return MemberForecast(
        "ecmwf_ifs025", [start + timedelta(days=i) for i in range(members.shape[1])], members
    )


def test_dry_run_counts_and_missing_day_breaks_run() -> None:
    assert longest_dry_run(np.array([0, 0, 5, 0, 0, 0, 1.0])) == 4
    assert longest_dry_run(np.array([0, 0, np.nan, 0, 0])) == 2


def test_dry_spell_is_share_of_members() -> None:
    test_members = np.full((51, 15), 5.0)
    test_members[:17, :] = 0.0  # 17 of 51 members dry -> 0.333
    est = {
        e.hazard: e
        for e in estimate_hazards(
            _test_forecast(test_members, date(2026, 8, 1)),
            "soybean",
            date(2026, 7, 1),
            date(2026, 8, 1),
        )
    }
    assert est["dry_spell"].exceeding == 17
    assert round(est["dry_spell"].probability or 0, 3) == 0.333


def test_heavy_rain_uses_three_day_total() -> None:
    test_members = np.zeros((4, 15))
    test_members[0, 2:5] = 18.0  # 54 mm over 3 days, no single day >= 20 mm
    test_members[1, 6] = 25.0  # one day >= 20 mm
    est = {
        e.hazard: e
        for e in estimate_hazards(
            _test_forecast(test_members, date(2026, 8, 1)),
            "rice",
            date(2026, 7, 1),
            date(2026, 8, 1),
        )
    }
    assert est["heavy_rain"].exceeding == 2


def test_harvest_rain_only_while_ripening() -> None:
    test_members = np.zeros((5, 15))
    test_members[:, 3] = 30.0
    sown = date(2025, 11, 10)
    ripe = {
        e.hazard
        for e in estimate_hazards(
            _test_forecast(test_members, date(2026, 3, 20)), "wheat", sown, date(2026, 3, 20)
        )
    }
    early = {
        e.hazard
        for e in estimate_hazards(
            _test_forecast(test_members, date(2025, 12, 1)), "wheat", sown, date(2025, 12, 1)
        )
    }
    assert "harvest_rain" in ripe and "harvest_rain" not in early


def test_wilson_interval_and_severity_bands() -> None:
    lo, hi = wilson_interval(0, 51)
    assert lo == 0.0 and 0 < hi < 0.1
    assert severity_band(None, 1.0) == "unknown"
    assert severity_band(0.9, 1.0) == "severe"
    assert severity_band(0.5, 0.6) == "moderate"


TEST_EVIDENCE = {
    "risks": [{"probability": 0.62, "members": {"ecmwf": {"total": 51, "exceeding": 32}}}]
}
TEST_PASSAGES = {"c1": "Apply 2 irrigations at critical stages; mulch with crop residue at 5 t/ha."}
TEST_DAY = date(2026, 11, 1)


def test_grounded_plan_passes() -> None:
    actions = [
        {
            "text": "Mulch with crop residue at 5 t/ha within 3 days: 62% chance of a dry spell",
            "when": TEST_DAY + timedelta(days=2),
            "citation_id": "c1",
        }
    ]
    assert verify_plan(actions, TEST_EVIDENCE, TEST_PASSAGES, TEST_DAY) == []


def test_deliberately_wrong_number_is_rejected() -> None:
    actions = [{"text": "Mulch at 8 t/ha, 75% chance", "when": TEST_DAY, "citation_id": "c1"}]
    reasons = [r for _, r in verify_plan(actions, TEST_EVIDENCE, TEST_PASSAGES, TEST_DAY)]
    assert any("8" in r for r in reasons) and any("75" in r for r in reasons)


def test_hindi_digits_are_normalised() -> None:
    actions = [
        {
            "text": "फसल अवशेष से ५ t/ha मल्चिंग करें, सूखे की ६२% संभावना",
            "when": TEST_DAY,
            "citation_id": "c1",
        }
    ]
    assert verify_plan(actions, TEST_EVIDENCE, TEST_PASSAGES, TEST_DAY) == []


def test_missing_citation_and_out_of_window_date_rejected() -> None:
    actions = [
        {"text": "Mulch", "when": TEST_DAY, "citation_id": ""},
        {"text": "Mulch", "when": TEST_DAY + timedelta(days=40), "citation_id": "c1"},
    ]
    reasons = [r for _, r in verify_plan(actions, TEST_EVIDENCE, TEST_PASSAGES, TEST_DAY)]
    assert "no citation" in reasons and any("outside" in r for r in reasons)


def test_rule_based_plan_always_verifies() -> None:
    actions = rulebased.build([{"id": "c1", "text": TEST_PASSAGES["c1"]}], TEST_DAY)
    assert actions
    assert verify_plan(actions, TEST_EVIDENCE, TEST_PASSAGES, TEST_DAY) == []


def test_cloudy_optical_adds_radar_not_another_optical_source() -> None:
    test_series = [
        {"date": "2026-07-01", "ndvi": 0.6, "ndmi": 0.2, "cloud_frac": 0.05},
        {"date": "2026-07-28", "ndvi": None, "ndmi": None, "cloud_frac": 0.95},
    ]
    g = gates.check(
        "optical",
        {"status": "ok", "data": test_series},
        has_next=True,
        as_of=date(2026, 7, 30),
        live=True,
        max_cloud=0.3,
        max_optical_age_days=12,
        max_weather_age_hours=12,
        radar_planned=False,
    )
    assert not g.ok and g.action == "add_radar" and g.check == "cloud"


def test_failed_source_moves_down_chain() -> None:
    g = gates.check(
        "forecast",
        {"status": "error", "error": "timeout"},
        has_next=True,
        as_of=date(2026, 7, 30),
        live=True,
        max_cloud=0.3,
        max_optical_age_days=12,
        max_weather_age_hours=12,
        radar_planned=False,
    )
    assert g.action == "next_source" and g.check == "error"


def test_heading_scenario_real_text() -> None:
    from app.rag.scenarios import heading_scenario

    assert (
        heading_scenario("Heavy rainfall with high speed winds in a short span")
        == "unseasonal_rain"
    )
    assert heading_scenario("Heavy rainfall with high") == "unseasonal_rain"
    unusual_heading = (
        "2.2 Unusual rains (untimely, unseasonal etc) (for both rainfed and irrigated situations)"
    )
    assert heading_scenario(unusual_heading) == "unseasonal_rain"
    assert heading_scenario("Early season drought (delayed onset)") == "early_drought"
    assert (
        heading_scenario("Normal onset followed by 15-20 days dry spell after sowing")
        == "early_dry_spell"
    )
    assert heading_scenario("Mid season drought (long dry spell)") == "mid_drought"
    assert heading_scenario("Terminal drought (early withdrawal)") == "terminal_drought"
    assert heading_scenario("Floods") == "excess_rain"
    assert (
        heading_scenario("Continuous high rainfall in a short span leading to water logging")
        == "excess_rain"
    )
    assert heading_scenario("Transient water logging/ partial inundation") == "excess_rain"
    assert heading_scenario("Continuous submergence") == "excess_rain"
    assert heading_scenario("2.1.2 Drought - Irrigated situation") == "early_drought"
    assert (
        heading_scenario("Delayed release of water in canals due to low rainfall")
        == "early_drought"
    )
    assert heading_scenario("Heat wave") == "heat_cold_hail"
    assert heading_scenario("Outbreak of pests and diseases") == "pest_disease"
