"""End-to-end LangGraph runs with stubbed tools (no network, no database).

Proves the control flow the judges will ask about: source fallback, verifier rejection and redraft,
and the rule-based plan when the LLM is down. All tool outputs are hand-built test inputs.
"""

from datetime import UTC, date, datetime, timedelta
from typing import Any

import numpy as np
import pytest

from app.agent.graph import run_assessment
from app.agent.tools import ToolOutput
from app.agent.trace import Trace
from app.connectors.base import FetchResult, SourceUnavailable
from app.connectors.imd import Climatology
from app.connectors.llm import DraftAction, DraftPlan
from app.connectors.open_meteo import Antecedent
from app.risk.engine import MemberForecast

TODAY = datetime.now(UTC).date()
TEST_FIELD = {
    "id": "00000000-0000-4000-8000-000000000001",
    "name": "test field",
    "crop": "soybean",
    "sowing_date": TODAY - timedelta(days=55),
    "district_code": "KA_DHARWAD",
    "lat": 15.4,
    "lon": 75.0,
    "geometry": {
        "type": "Polygon",
        "coordinates": [[[75.0, 15.4], [75.002, 15.4], [75.002, 15.402], [75.0, 15.4]]],
    },
}


def _fetched(source: str) -> FetchResult:
    return FetchResult(source, {}, "live", datetime.now(UTC), f"https://test/{source}")


def _test_members(n: int, model: str) -> MemberForecast:
    m = np.full((n, 15), 4.0)
    m[: n // 2, :] = 0.0
    return MemberForecast(model, [TODAY + timedelta(days=i) for i in range(15)], m)


async def failing(ctx: dict[str, Any]) -> ToolOutput:
    raise SourceUnavailable("test", "simulated outage")


async def ecmwf(ctx: dict[str, Any]) -> ToolOutput:
    return ToolOutput(_test_members(51, "ecmwf_ifs025"), _fetched("open_meteo_ensemble"))


async def gefs(ctx: dict[str, Any]) -> ToolOutput:
    return ToolOutput(_test_members(31, "ncep_gefs025"), _fetched("open_meteo_ensemble"))


async def optical(ctx: dict[str, Any]) -> ToolOutput:
    obs = [
        {
            "date": (TODAY - timedelta(days=3)).isoformat(),
            "ndvi": 0.55,
            "ndmi": 0.1,
            "cloud_frac": 0.0,
        }
    ]
    return ToolOutput(obs, _fetched("sentinel_hub"))


async def recent(ctx: dict[str, Any]) -> ToolOutput:
    return ToolOutput(Antecedent(12.0, [], None, None, None, []), _fetched("open_meteo_forecast"))


async def soil(ctx: dict[str, Any]) -> ToolOutput:
    return ToolOutput(
        Antecedent(None, [], 0.21, 15.0, "2016-2025", []), _fetched("open_meteo_archive")
    )


async def clim(ctx: dict[str, Any]) -> ToolOutput:
    return ToolOutput(Climatology(15.5, 75.0, "1991-2020", 30, 40.0, 0.2, 0.1, 0.3), None)


TEST_PASSAGES = [
    {
        "id": "11111111-1111-4111-8111-111111111111",
        "doc_title": "Test plan",
        "plan_year": 2011,
        "page": 20,
        "scenario": "mid_drought",
        "text": "Provide protective irrigation at pod formation; apply mulch to conserve moisture.",
    }
]


async def retrieve(
    district: str, scenarios: list[str], crop: str, query: str, k: int
) -> list[dict[str, Any]]:
    return TEST_PASSAGES


def registry(primary: Any) -> dict[str, Any]:
    return {
        "ecmwf_ensemble": primary,
        "gefs_ensemble": gefs,
        "multi_model": failing,
        "s2_sentinel_hub": optical,
        "s2_planetary": optical,
        "s1_planetary": failing,
        "recent_open_meteo": recent,
        "recent_nasa": recent,
        "soil_era5": soil,
        "sensor": failing,
        "climatology_imd": clim,
    }


class Recorder:
    def __init__(self) -> None:
        self.state: dict[str, Any] = {}
        self.status = ""

    async def persist(self, state: dict[str, Any], status: str) -> None:
        self.state, self.status = state, status


async def noop(*_: Any) -> None:
    return None


def _deps(primary: Any, drafter: Any, rec: Recorder) -> dict[str, Any]:
    return {
        "registry": registry(primary),
        "retrieve": retrieve,
        "draft": drafter,
        "persist": rec.persist,
        "mark_running": noop,
        "persist_failure": noop,
    }


async def test_fallback_then_verifier_rejects_then_passes() -> None:
    calls = {"n": 0}

    async def drafter(
        field: Any, risks: Any, evidence: Any, passages: Any, language: str, feedback: Any
    ) -> tuple[DraftPlan, str]:
        calls["n"] += 1
        why = "99% chance of a dry spell" if calls["n"] == 1 else "48% of members show a dry spell"
        action = DraftAction(
            text=f"Provide protective irrigation at pod formation; {why}",
            when=TODAY + timedelta(days=1),
            citation_id=TEST_PASSAGES[0]["id"],
        )
        return DraftPlan(summary="Dry spell risk during flowering.", actions=[action]), "test"

    rec, trace = Recorder(), Trace("a1", persist=False)
    await run_assessment(
        "a1", TEST_FIELD, None, "en", trace=trace, deps=_deps(failing, drafter, rec)
    )
    events = [e["event"] for e in trace.events]
    assert "fallback_used" in events  # ECMWF failed -> GEFS
    assert "verifier_rejected" in events  # 99% is not in the evidence
    assert events[-1] == "done"
    assert rec.state["plan_generator"] == "llm"
    assert rec.state["plan"][0].citation.page == 20
    assert rec.status == "completed_degraded"  # a fallback was used
    fallback = next(e for e in trace.events if e["event"] == "fallback_used")
    assert fallback["detail"]["to_source"] == "open_meteo_ensemble"
    dry = next(r for r in rec.state["risks"] if r.hazard == "dry_spell")
    assert dry.members.gfs.exceeding == 15 and dry.members.gfs.total == 31
    done = trace.events[-1]["detail"]  # CONTRACTS.md: done carries status, result_url, duration_ms
    assert set(done) == {"status", "result_url", "duration_ms", "degraded"}
    assert isinstance(done["duration_ms"], int) and done["duration_ms"] >= 0
    assert done["degraded"] is True and done["status"] == "completed_degraded"


async def test_failed_run_still_ends_with_error_then_done_with_duration() -> None:
    rec, trace = Recorder(), Trace("a4", persist=False)
    broken_field = {k: v for k, v in TEST_FIELD.items() if k != "crop"}  # test input: no crop
    with pytest.raises(KeyError):
        await run_assessment(
            "a4", broken_field, None, "en", trace=trace, deps=_deps(ecmwf, None, rec)
        )
    assert [e["event"] for e in trace.events[-2:]] == ["error", "done"]  # B-4: done follows error
    done = trace.events[-1]["detail"]
    assert done["status"] == "failed" and isinstance(done["duration_ms"], int)


async def test_llm_down_gives_rule_based_plan_with_citations() -> None:
    async def drafter(*_: Any) -> tuple[DraftPlan, str]:
        raise SourceUnavailable("gemini", "429 RESOURCE_EXHAUSTED")

    rec, trace = Recorder(), Trace("a2", persist=False)
    await run_assessment("a2", TEST_FIELD, None, "hi", trace=trace, deps=_deps(ecmwf, drafter, rec))
    assert rec.state["plan_generator"] == "rule_based"
    assert rec.state["plan"][0].citation.chunk_id == TEST_PASSAGES[0]["id"]
    dry = next(r for r in rec.state["risks"] if r.hazard == "dry_spell")
    assert dry.members.ecmwf.total == 51 and dry.probability_ci90 is not None
    assert dry.climatology_probability == 0.2
    ids = {e.id for e in rec.state["book"].items}
    assert set(dry.driver_ids) <= ids  # every driver points at real evidence


async def test_past_date_before_archive_uses_model_mode() -> None:
    rec, trace = Recorder(), Trace("a3", persist=False)
    deps = _deps(ecmwf, None, rec)
    deps["registry"] |= {
        "model_inputs_imd": failing,
        "antecedent_era5": failing,
        "observed_after": failing,
    }
    old_field = TEST_FIELD | {"sowing_date": date(2023, 7, 1)}
    await run_assessment("a3", old_field, date(2023, 8, 5), "en", trace=trace, deps=deps)
    intake = trace.events[0]
    assert intake["detail"]["mode"] == "observed_rain_model"
    assert trace.events[-1]["event"] == "done"
