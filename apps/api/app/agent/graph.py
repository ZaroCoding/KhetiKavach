"""The KhetKavach agent as a LangGraph state graph (docs/ARCHITECTURE.md, agent graph).

intake -> plan -> gather -> quality_gate --(fail)--> fallback -> gather   (max 2 loops)
                                  \\--(pass)--> assess -> retrieve -> draft -> verify -> finalize
                                                          draft fails --> rule_based -> finalize
                                                          verify rejects --> draft (max 3 drafts)
Every node emits trace events (agent_steps rows) streamed to the UI over SSE.
"""

import asyncio
import gc
import time
from datetime import date, timedelta
from typing import Any, TypedDict

from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, StateGraph

from app.agent import gates
from app.agent.evidence import EvidenceBook
from app.agent.persist import mark_failed, mark_running, persist_assessment
from app.agent.tools import REASONS, REGISTRY, TOOL_SOURCE, ToolOutput, chains_for, today_utc
from app.agent.trace import Trace
from app.config import get_settings
from app.connectors.base import SourceUnavailable
from app.connectors.llm import draft_plan
from app.connectors.open_meteo import SINGLE_RUNS_FIRST_DATE
from app.connectors.satellite import optical_summary, season_points
from app.rag import rulebased
from app.rag.retriever import retrieve as rag_retrieve
from app.rag.scenarios import scenarios_for_risk
from app.rag.verifier import verify_plan
from app.risk import model as dry_model
from app.risk.crops import stage_on
from app.risk.engine import (
    DRY_DAY_MM,
    DRY_SPELL_DAYS,
    HazardEstimate,
    MemberForecast,
    estimate_hazards,
    quantile_series,
    severity_band,
    wilson_interval,
)
from app.schemas import Citation, MemberCount, Members, PlanAction, Risk, Threshold, Window

MAX_GATHER_LOOPS = 2
MAX_DRAFTS = 3
SEVERITY_ORDER = {"unknown": -1, "low": 0, "moderate": 1, "high": 2, "severe": 3}


class AgentState(TypedDict, total=False):
    assessment_id: str
    field: dict[str, Any]
    as_of: date
    live: bool
    mode: str  # live | archived_forecast | observed_rain_model
    language: str
    ctx: dict[str, Any]
    chains: dict[str, list[str]]
    source_idx: dict[str, int]
    results: dict[str, dict[str, Any]]
    pending: list[tuple[str, str]]
    to_run: list[str]
    loops: int
    book: EvidenceBook
    risks: list[Risk]
    model_version: str | None
    passages: list[dict[str, Any]]
    draft: Any
    draft_attempts: int
    problems: list[tuple[str, str]]
    plan: list[PlanAction]
    plan_summary: str | None
    plan_generator: str


def _trace(config: RunnableConfig) -> Trace:
    trace: Trace = config["configurable"]["trace"]
    return trace


def _deps(config: RunnableConfig) -> dict[str, Any]:
    deps: dict[str, Any] = config["configurable"].get("deps", {})
    return deps


# ============================================================================ nodes
async def intake(state: AgentState, config: RunnableConfig) -> dict[str, Any]:
    f, as_of = state["field"], state["as_of"]
    info = stage_on(f["crop"], f["sowing_date"], as_of)
    if state["live"]:
        mode = "live"
    elif as_of >= SINGLE_RUNS_FIRST_DATE:
        mode = "archived_forecast"
    else:
        mode = "observed_rain_model"
    ctx = {
        "field_id": f["id"],
        "lat": f["lat"],
        "lon": f["lon"],
        "geometry": f["geometry"],
        "as_of": as_of,
        "live": state["live"],
        "das": info.das,
        "stage": info.name,
    }
    note = {
        "live": "live run on today's data",
        "archived_forecast": "Time Machine: the forecast actually issued on this date",
        "observed_rain_model": "Time Machine before archived forecasts exist: LightGBM on rain "
        "observed up to the day before",
    }[mode]
    await _trace(config).emit(
        "node_started",
        "intake",
        detail={
            "message": f"{f['crop']} sown {f['sowing_date']}: day {info.das}, stage {info.name}",
            "mode": mode,
            "note": note,
        },
    )
    return {
        "ctx": ctx,
        "mode": mode,
        "loops": 0,
        "draft_attempts": 0,
        "results": {},
        "source_idx": {},
        "problems": [],
    }


async def plan(state: AgentState, config: RunnableConfig) -> dict[str, Any]:
    chains = chains_for(state["mode"], state["as_of"].month)
    if state["ctx"]["stage"] in ("pre_sowing", "past_maturity"):
        chains.pop("radar", None)
    # Hardware sensor is optional: only planned if a device is registered (ARCHITECTURE.md line 87)
    has_sensor = state.get("has_sensor")
    if has_sensor is None:
        try:
            from app import db

            if db.is_connected():
                has_sensor = bool(
                    await db.pool().fetchval(
                        "SELECT 1 FROM sensor_devices WHERE field_id = $1::uuid LIMIT 1",
                        state["field"]["id"],
                    )
                )
        except Exception:
            has_sensor = False
    if not has_sensor:
        chains.pop("sensor", None)
    await _trace(config).emit(
        "node_started",
        "plan",
        detail={
            "message": f"{len(chains)} tools planned",
            "tools": {g: {"chain": c, "why": REASONS.get(g, "")} for g, c in chains.items()},
        },
    )
    return {"chains": chains, "source_idx": dict.fromkeys(chains, 0), "to_run": list(chains)}


async def gather(state: AgentState, config: RunnableConfig) -> dict[str, Any]:
    trace = _trace(config)
    registry = _deps(config).get("registry", REGISTRY)
    results = dict(state.get("results", {}))
    await trace.emit(
        "node_started",
        "gather",
        detail={"message": f"calling {len(state['to_run'])} tools in parallel"},
    )

    async def run(group: str) -> None:
        tool = state["chains"][group][state["source_idx"][group]]
        source = TOOL_SOURCE[tool]
        t0 = time.perf_counter()
        try:
            out: ToolOutput = await registry[tool](state["ctx"])
            ms = int((time.perf_counter() - t0) * 1000)
            results[group] = {
                "status": "ok",
                "tool": tool,
                "data": out.data,
                "fetched": out.fetched,
                "extra": out.extra,
            }
            await trace.emit(
                "tool_result",
                "gather",
                tool=tool,
                latency_ms=ms,
                detail={
                    "source": source,
                    "summary": _summary(out.data),
                    "freshness": out.fetched.status if out.fetched else "archived",
                    "note": out.fetched.note if out.fetched else None,
                },
            )
        except Exception as exc:
            ms = int((time.perf_counter() - t0) * 1000)
            error = f"{type(exc).__name__}: {exc}"[:300]
            results[group] = {"status": "error", "tool": tool, "error": error}
            await trace.emit(
                "tool_result",
                "gather",
                tool=tool,
                status="failed",
                latency_ms=ms,
                detail={"source": source, "error": error},
            )

    sem = asyncio.Semaphore(2)

    async def bounded_run(g: str) -> None:
        async with sem:
            await run(g)

    await asyncio.gather(*(bounded_run(g) for g in state["to_run"]))
    gc.collect()
    return {"results": results}


async def quality_gate(state: AgentState, config: RunnableConfig) -> dict[str, Any]:
    s = get_settings()
    trace = _trace(config)
    pending: list[tuple[str, str]] = []
    degraded = 0
    for group in state["to_run"]:
        r = state["results"][group]
        g = gates.check(
            group,
            r,
            has_next=state["source_idx"][group] + 1 < len(state["chains"][group]),
            as_of=state["as_of"],
            live=state["live"],
            max_cloud=s.max_cloud_fraction,
            max_optical_age_days=s.max_optical_age_days,
            max_weather_age_hours=s.max_weather_age_hours,
            radar_planned="radar" in state["chains"],
        )
        if not g.ok:
            degraded += 1
            r["gate_reason"] = g.reason
            r["degraded"] = True
            await trace.emit(
                "gate_failed",
                "quality_gate",
                tool=r["tool"],
                detail={"check": g.check, "reason": g.reason, "action": g.action},
            )
            if g.action != "accept":
                pending.append((group, g.action))
    if not pending:
        await trace.emit(
            "node_started",
            "quality_gate",
            status="succeeded",
            detail={
                "message": "all inputs passed"
                if not degraded
                else f"{degraded} input(s) degraded, no fallback left; uncertainty widened"
            },
        )
    return {"pending": pending}


async def fallback(state: AgentState, config: RunnableConfig) -> dict[str, Any]:
    trace = _trace(config)
    idx, chains, to_run = dict(state["source_idx"]), dict(state["chains"]), []
    for group, action in state["pending"]:
        reason = state["results"][group].get("gate_reason")
        if action == "next_source":
            old = chains[group][idx[group]]
            idx[group] += 1
            new = chains[group][idx[group]]
            to_run.append(group)
            await trace.emit(
                "fallback_used",
                "fallback",
                tool=new,
                detail={
                    "from_source": TOOL_SOURCE[old],
                    "to_source": TOOL_SOURCE[new],
                    "from_tool": old,
                    "to_tool": new,
                    "reason": reason,
                },
            )
        elif action == "add_radar":
            chains["radar"] = ["s1_planetary"]
            idx["radar"] = 0
            to_run.append("radar")
            await trace.emit(
                "fallback_used",
                "fallback",
                tool="s1_planetary",
                detail={
                    "from_source": TOOL_SOURCE[chains[group][idx[group]]],
                    "to_source": "planetary_computer_s1",
                    "reason": reason,
                    "message": "optical is cloud-blind: adding Sentinel-1 radar",
                },
            )
    return {"source_idx": idx, "chains": chains, "to_run": to_run, "loops": state["loops"] + 1}


def _ok(state: AgentState, group: str) -> bool:
    return state["results"].get(group, {}).get("status") == "ok"


def _src(state: AgentState, group: str, default: str) -> str:
    tool = state["results"].get(group, {}).get("tool")
    return TOOL_SOURCE.get(tool, default) if tool else default


async def assess(state: AgentState, config: RunnableConfig) -> dict[str, Any]:
    s = get_settings()
    res, f, as_of = state["results"], state["field"], state["as_of"]
    book = EvidenceBook()
    drivers: list[str] = []
    notes: list[str] = []

    # ---------- field evidence
    if _ok(state, "optical"):
        r = res["optical"]
        src, fetched = TOOL_SOURCE[r["tool"]], r["fetched"]
        summ = optical_summary(r["data"], as_of, s.max_cloud_fraction)
        pts = season_points(r["data"], as_of, s.max_cloud_fraction)
        book.series("ndvi", [(p["date"], p["ndvi"]) for p in pts], None, src, fetched)
        book.series("ndmi", [(p["date"], p["ndmi"]) for p in pts], None, src, fetched)
        hist = [(p["date"], p["hist_median"]) for p in pts if p["hist_median"] is not None]
        if hist:
            book.series("ndvi_hist_median", hist, None, src, fetched)
        if summ.get("latest_clear"):
            book.value("ndvi_latest", summ["latest_clear"]["ndvi"], None, src, fetched)
            book.value("optical_age_days", summ["age_days"], "days", src, fetched)
        if summ.get("ndvi_anomaly") is not None:
            drivers.append(book.value("ndvi_anomaly", summ["ndvi_anomaly"], None, src, fetched))
            notes.append(
                f"NDVI is {summ['ndvi_anomaly']:+.3f} versus this field's own median for the date"
            )
    else:
        book.unavailable("ndvi", _src(state, "optical", "sentinel_hub"))
    if "radar" in state["chains"]:
        if _ok(state, "radar"):
            r = res["radar"]
            pts = r["data"]
            book.series(
                "vh_db",
                [(date.fromisoformat(p["date"]), p["vh_db"]) for p in pts],
                "dB",
                "planetary_computer_s1",
                r["fetched"],
            )
            book.series(
                "vv_db",
                [(date.fromisoformat(p["date"]), p["vv_db"]) for p in pts],
                "dB",
                "planetary_computer_s1",
                r["fetched"],
            )
        else:
            book.unavailable("vh_db", "planetary_computer_s1")
    if _ok(state, "antecedent"):
        r = res["antecedent"]
        a, src = r["data"], TOOL_SOURCE[r["tool"]]
        if a.rain_last_30d_mm is not None:
            drivers.append(book.value("rain_30d", a.rain_last_30d_mm, "mm", src, r["fetched"]))
            notes.append(f"Rain in the last 30 days: {a.rain_last_30d_mm:g} mm")
        book.series("rain_daily", a.rain_series, "mm", src, r["fetched"])
        if a.soil_moisture_percentile is not None:
            clim_fetch = (r.get("extra") or [r["fetched"]])[-1]
            drivers.append(
                book.value(
                    "soil_moisture_percentile",
                    a.soil_moisture_percentile,
                    "percentile",
                    "open_meteo_archive",
                    clim_fetch,
                )
            )
    else:
        book.unavailable("rain_30d", _src(state, "antecedent", "open_meteo_forecast"))
    if "soil" in state["chains"]:
        if _ok(state, "soil"):
            r = res["soil"]
            a = r["data"]
            if a.soil_moisture_m3m3 is not None:
                book.value(
                    "soil_moisture",
                    a.soil_moisture_m3m3,
                    "m3/m3",
                    "open_meteo_archive",
                    r["fetched"],
                )
            if a.soil_moisture_percentile is not None:
                drivers.append(
                    book.value(
                        "soil_moisture_percentile",
                        a.soil_moisture_percentile,
                        "percentile",
                        "open_meteo_archive",
                        r["fetched"],
                    )
                )
                notes.append(
                    f"Root-zone soil moisture is at the {a.soil_moisture_percentile:g}th "
                    f"percentile for this time of year ({a.soil_climatology_years})"
                )
        else:
            book.unavailable("soil_moisture_percentile", "open_meteo_archive")
    if _ok(state, "sensor"):
        r = res["sensor"]
        book.value(
            "soil_moisture_pct", r["data"]["soil_moisture_pct"], "%", "esp32_sensor", r["fetched"]
        )
    clim = res["climatology"]["data"] if _ok(state, "climatology") else None
    clim_ids: dict[str, str] = {}
    if clim:
        clim_ids = {
            "dry_spell": book.value(
                "clim_p_dry_spell", clim.p_dry_spell, "fraction", "imd_gridded", None
            ),
            "heavy_rain": book.value(
                "clim_p_heavy_rain", clim.p_heavy_rain, "fraction", "imd_gridded", None
            ),
            "harvest_rain": book.value(
                "clim_p_harvest_rain", clim.p_harvest_rain, "fraction", "imd_gridded", None
            ),
        }
        book.value("normal_rain_15d", clim.normal_total_mm, "mm", "imd_gridded", None)
    else:
        book.unavailable("clim_p_dry_spell", "imd_gridded")
    clim_p = (
        {
            "dry_spell": clim.p_dry_spell,
            "heavy_rain": clim.p_heavy_rain,
            "harvest_rain": clim.p_harvest_rain,
        }
        if clim
        else {}
    )

    # ---------- risks
    risks: list[Risk] = []
    model_version: str | None = "risk-engine-v1"
    if _ok(state, "forecast"):
        r = res["forecast"]
        fc: MemberForecast = r["data"]
        q = quantile_series(fc)
        fid = book.series("precip_p50", q["p50"], "mm/day", fc.source, r["fetched"])
        book.series("precip_p10", q["p10"], "mm/day", fc.source, r["fetched"])
        book.series("precip_p90", q["p90"], "mm/day", fc.source, r["fetched"])
        book.series("wet_member_share", q["wet_share"], "fraction", fc.source, r["fetched"])
        cross: dict[str, HazardEstimate] = {}
        if _ok(state, "cross_check") and res["cross_check"]["data"].model != fc.model:
            cc = res["cross_check"]["data"]
            cross = {h.hazard: h for h in estimate_hazards(cc, f["crop"], f["sowing_date"], as_of)}
        for est in estimate_hazards(fc, f["crop"], f["sowing_date"], as_of):
            risks.append(
                _risk_from_forecast(
                    est, fc, cross.get(est.hazard), clim_p, clim_ids, [fid, *drivers], notes
                )
            )
    elif "forecast" in state["chains"]:
        book.unavailable("precip_p50", _src(state, "forecast", "open_meteo_ensemble"))
    if not _ok(state, "forecast") and _ok(state, "model_inputs"):
        mi = res["model_inputs"]["data"]
        feats = dry_model.features_from_series(mi["rain"], as_of, mi["clim_p_dry"], *mi["cell"])
        info = stage_on(f["crop"], f["sowing_date"], as_of)
        weight = min(1.0, info.stage.drought_ky) if info.stage else 0.0
        try:
            p, model_version = dry_model.predict(feats)
            rid = book.value("model_p_dry_spell", round(p, 3), "fraction", "imd_gridded", None)
            r30 = book.value("imd_rain_30d", round(feats["rain_30d"], 1), "mm", "imd_gridded", None)
            risks.append(
                Risk(
                    hazard="dry_spell",
                    probability=round(p, 3),
                    climatology_probability=clim_p.get("dry_spell"),
                    severity=severity_band(p, weight),
                    threshold=Threshold(
                        description=f">= {DRY_SPELL_DAYS} consecutive days with < {DRY_DAY_MM} mm",
                        value=DRY_SPELL_DAYS,
                        unit="days",
                    ),
                    horizon_days=15,
                    crop_stage=info.name,
                    stage_weight=round(weight, 2),
                    method="model",
                    members=None,
                    driver_ids=[rid, r30, *clim_ids.values()],
                    explanation=[
                        f"LightGBM ({model_version}) on IMD rain observed up to "
                        f"{as_of - timedelta(days=1)}",
                        f"Rain in the previous 30 days: {feats['rain_30d']:.1f} mm",
                    ],
                    window=Window(start=as_of, end=as_of + timedelta(days=14)),
                    uncertainty_note="No archived forecast exists for this date; this is a model "
                    "estimate from observed rain, not a weather forecast.",
                )
            )
        except FileNotFoundError as exc:
            await _trace(config).emit(
                "gate_failed",
                "assess",
                tool="lightgbm",
                detail={"check": "gaps", "reason": str(exc)},
            )
            model_version = None
    if clim and not _ok(state, "forecast") and not state["live"]:
        info = stage_on(f["crop"], f["sowing_date"], as_of)
        for hazard, desc, value in (
            ("heavy_rain", "any day >= 20 mm or 3-day total >= 50 mm", 20.0),
            ("harvest_rain", "ripening days: any day >= 15.6 mm or 3-day total >= 25 mm", 15.6),
        ):
            if any(x.hazard == hazard for x in risks):
                continue
            if hazard == "harvest_rain" and info.name != "ripening":
                continue
            weight = 1.0 if hazard == "harvest_rain" else 0.5
            p = clim_p[hazard]
            risks.append(
                Risk(
                    hazard=hazard,
                    probability=p,
                    climatology_probability=p,
                    severity=severity_band(p, weight),
                    threshold=Threshold(description=desc, value=value, unit="mm/day"),
                    horizon_days=15,
                    crop_stage=info.name,
                    stage_weight=weight,
                    method="climatology",
                    driver_ids=[clim_ids[hazard]],
                    explanation=[
                        f"No archived forecast for this date: frequency in IMD {clim.years} "
                        f"at cell {clim.lat}, {clim.lon}"
                    ],
                    window=Window(start=as_of, end=as_of + timedelta(days=14)),
                    uncertainty_note="Climatological frequency only.",
                )
            )
    if _ok(state, "observed_after"):
        r = res["observed_after"]
        book.series("observed_precip_after", r["data"], "mm", "open_meteo_archive", r["fetched"])

    top = _headline(risks)
    await _trace(config).emit(
        "node_started",
        "assess",
        status="succeeded",
        detail={
            "message": _headline_message(top),
            "risks": [
                {
                    "hazard": x.hazard,
                    "probability": x.probability,
                    "severity": x.severity,
                    "method": x.method,
                }
                for x in risks
            ],
        },
    )
    gc.collect()
    return {"book": book, "risks": risks, "model_version": model_version}


def _risk_from_forecast(
    est: HazardEstimate,
    fc: MemberForecast,
    cross: HazardEstimate | None,
    clim_p: dict[str, float],
    clim_ids: dict[str, str],
    driver_ids: list[str],
    notes: list[str],
) -> Risk:
    p = est.probability
    counts = MemberCount(total=est.total, exceeding=est.exceeding)
    members = None
    if fc.method == "ensemble":
        members = Members(
            ecmwf=counts if fc.model.startswith("ecmwf") else None,
            gfs=counts if fc.model.startswith("ncep") else None,
        )
        if cross is not None and members.gfs is None:
            members.gfs = MemberCount(total=cross.total, exceeding=cross.exceeding)
    method = {
        "ensemble": "ensemble",
        "multi_model": "multi_model",
        "deterministic_replay": "deterministic_replay",
    }[fc.method]
    explanation = [f"{est.exceeding} of {est.total} {fc.model} members show the event", *est.notes]
    if cross is not None:
        explanation.append(f"Cross-check, NOAA GEFS: {cross.exceeding} of {cross.total} members")
    if est.hazard in clim_p:
        explanation.append(
            f"Usual chance for this window (IMD 1991-2020): {clim_p[est.hazard] * 100:.0f}%"
        )
    explanation += notes
    note = {
        "multi_model": "Agreement between independent deterministic models, not a calibrated "
        "probability.",
        "deterministic_replay": "Single archived forecast run: a yes/no outcome, not a "
        "probability.",
    }.get(fc.method)
    ids = list(driver_ids) + ([clim_ids[est.hazard]] if est.hazard in clim_ids else [])
    return Risk(
        hazard=est.hazard,
        probability=round(p, 3) if p is not None else None,
        probability_ci90=wilson_interval(est.exceeding, est.total)
        if fc.method == "ensemble"
        else None,
        climatology_probability=clim_p.get(est.hazard),
        severity=severity_band(p, est.stage_weight),
        threshold=est.threshold,
        horizon_days=len(fc.dates),
        crop_stage=", ".join(est.stage_names),
        stage_weight=round(est.stage_weight, 2),
        method=method,
        members=members,
        driver_ids=ids,
        explanation=explanation,
        window=Window(start=est.window_start, end=est.window_end),
        uncertainty_note=note,
    )


def _headline_message(top: Risk | None) -> str:
    """One-line trace summary. A replayed archived run is a yes/no outcome, not a percentage."""
    if top is None or top.probability is None:
        return "no probabilistic risk available"
    if top.method == "deterministic_replay":
        value = "YES" if top.probability else "NO"
    else:
        value = f"{top.probability:.0%}"
    return f"headline: {top.hazard} {value} ({top.severity})"


def _headline(risks: list[Risk]) -> Risk | None:
    scored = [r for r in risks if r.probability is not None]
    return max(scored, key=lambda r: (r.probability or 0) * r.stage_weight) if scored else None


async def retrieve(state: AgentState, config: RunnableConfig) -> dict[str, Any]:
    trace = _trace(config)
    retr = _deps(config).get("retrieve", rag_retrieve)
    f, ctx = state["field"], state["ctx"]
    targets = [r for r in state["risks"] if SEVERITY_ORDER[r.severity] >= 1]
    if not targets and (top := _headline(state["risks"])):
        targets = [top]
    passages: list[dict[str, Any]] = []
    seen: set[str] = set()
    for r in targets[:2]:
        scenarios = scenarios_for_risk(r.hazard, r.crop_stage.split(",")[0].strip(), ctx["das"])
        query = f"{f['crop']} {r.hazard.replace('_', ' ')} {r.crop_stage} contingency measures"
        try:
            for p in await retr(f["district_code"], scenarios, f["crop"], query, 4):
                if p["id"] not in seen:
                    seen.add(p["id"])
                    passages.append(p)
        except Exception as exc:
            await trace.emit(
                "gate_failed",
                "retrieve",
                tool="crida_plans",
                detail={"check": "error", "reason": str(exc)[:200]},
            )
    await trace.emit(
        "node_started",
        "retrieve",
        status="succeeded" if passages else "skipped",
        detail={
            "message": f"{len(passages)} contingency-plan passages for {f['district_code']}",
            "passages": [
                {"id": p["id"], "page": p["page"], "scenario": p["scenario"]} for p in passages
            ],
        },
    )
    gc.collect()
    return {"passages": passages}


async def draft(state: AgentState, config: RunnableConfig) -> dict[str, Any]:
    trace = _trace(config)
    drafter = _deps(config).get("draft") or draft_plan
    attempt = state.get("draft_attempts", 0) + 1
    if not state["passages"]:
        return {"draft": None, "draft_attempts": MAX_DRAFTS}
    feedback = [f"{item}: {reason}" for item, reason in state.get("problems", [])] or None
    t0 = time.perf_counter()
    try:
        plan_, provider = await drafter(
            _field_for_llm(state["field"]),
            [r.model_dump(mode="json") for r in state["risks"]],
            state["book"].numbers(),
            state["passages"],
            state["language"],
            feedback,
        )
        await trace.emit(
            "node_started",
            "draft",
            status="succeeded",
            latency_ms=int((time.perf_counter() - t0) * 1000),
            detail={"message": f"draft {attempt} from {provider}", "actions": len(plan_.actions)},
        )
        gc.collect()
        return {"draft": plan_, "draft_attempts": attempt}
    except Exception as exc:
        await trace.emit(
            "gate_failed",
            "draft",
            tool="gemini",
            latency_ms=int((time.perf_counter() - t0) * 1000),
            detail={"check": "error", "reason": str(exc)[:300], "action": "rule_based"},
        )
        gc.collect()
        return {"draft": None, "draft_attempts": MAX_DRAFTS}


def _draft_actions(plan_: Any) -> list[dict[str, Any]]:
    return [a.model_dump() for a in plan_.actions]


async def verify(state: AgentState, config: RunnableConfig) -> dict[str, Any]:
    trace = _trace(config)
    passages = {str(p["id"]): str(p["text"]) for p in state["passages"]}
    horizon = max((r.horizon_days for r in state["risks"]), default=15)
    evidence = {
        "risks": [r.model_dump(mode="json") for r in state["risks"]],
        "evidence": state["book"].numbers(),
    }
    problems = verify_plan(
        _draft_actions(state["draft"]), evidence, passages, state["as_of"], horizon
    )
    for item, reason in problems[:8]:
        await trace.emit(
            "verifier_rejected",
            "verify",
            detail={"attempt": state["draft_attempts"], "item": item, "reason": reason},
        )
    if not problems:
        await trace.emit(
            "node_started",
            "verify",
            status="succeeded",
            detail={
                "message": "every number is in the evidence; every action cites a retrieved passage"
            },
        )
    return {"problems": problems}


async def rule_based(state: AgentState, config: RunnableConfig) -> dict[str, Any]:
    actions = rulebased.build(state["passages"], state["as_of"]) if state["passages"] else []
    plan_ = _to_plan_actions(actions, state["passages"], "en")
    await _trace(config).emit(
        "node_started",
        "rule_based",
        status="succeeded",
        detail={"message": f"{len(plan_)} actions quoted from the contingency plan"},
    )
    gc.collect()
    return {
        "plan": plan_,
        "plan_summary": None,
        "plan_generator": "rule_based" if plan_ else "none",
    }


async def finalize(state: AgentState, config: RunnableConfig) -> dict[str, Any]:
    trace = _trace(config)
    if state.get("plan") is None and state.get("draft") is not None and not state.get("problems"):
        plan_ = _to_plan_actions(
            _draft_actions(state["draft"]), state["passages"], state["language"]
        )
        out: dict[str, Any] = {
            "plan": plan_,
            "plan_summary": state["draft"].summary,
            "plan_generator": "llm",
        }
    else:
        out = {
            "plan": state.get("plan", []),
            "plan_summary": state.get("plan_summary"),
            "plan_generator": state.get("plan_generator", "none"),
        }
    degraded = (
        trace.fallbacks > 0 or state["book"].any_unavailable() or out["plan_generator"] != "llm"
    )
    status = "completed_degraded" if degraded else "completed"
    persist = _deps(config).get("persist", persist_assessment)
    await persist(state | out, status)
    await trace.emit(
        "done",
        "finalize",
        detail={
            "status": status,
            "result_url": f"/api/assessments/{state['assessment_id']}",
            "duration_ms": trace.elapsed_ms(),
            "degraded": degraded,
        },
    )
    gc.collect()
    return out | {"status": status}


# ============================================================================ helpers
def _to_plan_actions(
    actions: list[dict[str, Any]], passages: list[dict[str, Any]], language: str
) -> list[PlanAction]:
    by_id = {str(p["id"]): p for p in passages}
    out = []
    for i, a in enumerate(actions, 1):
        p = by_id[str(a["citation_id"])]
        out.append(
            PlanAction(
                id=f"a{i}",
                when=a["when"],
                text=a["text"],
                language=language,
                citation=Citation(
                    chunk_id=str(p["id"]),
                    doc_title=str(p["doc_title"]),
                    page=int(p["page"]),
                    plan_year=int(p["plan_year"]),
                ),
                numbers_used=[float(x) for x in a.get("numbers_used", [])],
            )
        )
    return out


def _field_for_llm(f: dict[str, Any]) -> dict[str, Any]:
    return {
        "crop": f["crop"],
        "sowing_date": str(f["sowing_date"]),
        "district_code": f["district_code"],
    }


def _summary(data: Any) -> dict[str, Any]:
    if isinstance(data, MemberForecast):
        return {
            "model": data.model,
            "members": int(data.members.shape[0]),
            "days": int(data.members.shape[1]),
        }
    if isinstance(data, list):
        return {"observations": len(data)}
    if hasattr(data, "rain_last_30d_mm"):
        return {
            "rain_last_30d_mm": data.rain_last_30d_mm,
            "soil_moisture_percentile": data.soil_moisture_percentile,
        }
    if hasattr(data, "p_dry_spell"):
        return {"years": data.years, "p_dry_spell": data.p_dry_spell}
    if isinstance(data, dict):
        return {k: v for k, v in data.items() if isinstance(v, int | float | str)}
    return {}


def after_gate(state: AgentState) -> str:
    return "fallback" if state["pending"] and state["loops"] < MAX_GATHER_LOOPS else "assess"


def after_draft(state: AgentState) -> str:
    return "verify" if state.get("draft") is not None else "rule_based"


def after_verify(state: AgentState) -> str:
    if not state["problems"]:
        return "finalize"
    return "draft" if state["draft_attempts"] < MAX_DRAFTS else "rule_based"


def build_graph() -> Any:
    g = StateGraph(AgentState)
    for name, fn in [
        ("intake", intake),
        ("plan", plan),
        ("gather", gather),
        ("quality_gate", quality_gate),
        ("fallback", fallback),
        ("assess", assess),
        ("retrieve", retrieve),
        ("draft", draft),
        ("verify", verify),
        ("rule_based", rule_based),
        ("finalize", finalize),
    ]:
        g.add_node(name, fn)
    g.set_entry_point("intake")
    g.add_edge("intake", "plan")
    g.add_edge("plan", "gather")
    g.add_edge("gather", "quality_gate")
    g.add_conditional_edges(
        "quality_gate", after_gate, {"fallback": "fallback", "assess": "assess"}
    )
    g.add_edge("fallback", "gather")
    g.add_edge("assess", "retrieve")
    g.add_edge("retrieve", "draft")
    g.add_conditional_edges("draft", after_draft, {"verify": "verify", "rule_based": "rule_based"})
    g.add_conditional_edges(
        "verify",
        after_verify,
        {"finalize": "finalize", "draft": "draft", "rule_based": "rule_based"},
    )
    g.add_edge("rule_based", "finalize")
    g.add_edge("finalize", END)
    return g.compile()


GRAPH = build_graph()


async def run_assessment(
    assessment_id: str,
    field: dict[str, Any],
    as_of: date | None,
    language: str,
    trace: Trace | None = None,
    deps: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Run one assessment. `as_of=None` means live (ruling B-10)."""
    trace = trace or Trace(assessment_id)
    deps = deps or {}
    live = as_of is None or as_of >= today_utc()
    state: AgentState = {
        "assessment_id": assessment_id,
        "field": field,
        "as_of": today_utc() if live else as_of,  # type: ignore[typeddict-item]
        "live": live,
        "language": language,
    }
    mark = deps.get("mark_running", mark_running)
    await mark(assessment_id)
    try:
        result: dict[str, Any] = await GRAPH.ainvoke(
            state, config={"configurable": {"trace": trace, "deps": deps}, "recursion_limit": 40}
        )
        return result
    except Exception as exc:
        await trace.emit(
            "error", "agent", detail={"code": type(exc).__name__, "message": str(exc)[:400]}
        )
        fail = deps.get("persist_failure", mark_failed)
        await fail(assessment_id, str(exc))
        await trace.emit(
            "done",
            "finalize",
            detail={
                "status": "failed",
                "result_url": f"/api/assessments/{assessment_id}",
                "duration_ms": trace.elapsed_ms(),
                "degraded": False,
            },
        )
        if isinstance(exc, SourceUnavailable):
            return {"status": "failed"}
        raise
