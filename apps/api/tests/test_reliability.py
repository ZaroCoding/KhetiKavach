"""The failure modes seen on the hosted API: memory, dead runs, slow tools, an LLM out of quota."""

import asyncio
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app import db, errors
from app.agent import graph, persist
from app.agent.trace import Trace
from app.config import get_settings
from app.connectors import llm
from app.connectors.base import SourceUnavailable
from app.main import app
from app.rag import query_vectors, retriever
from app.risk.crops import CROPS, stages_in_window


# ------------------------------------------------------------------ the API never loads ONNX
def test_every_stage_combination_the_agent_can_ask_about_has_a_precomputed_query() -> None:
    queries = set(query_vectors.all_queries())
    sowing = date(2026, 1, 1)  # test input: walks one calendar through a whole season
    for crop in CROPS:
        for offset in range(-20, 220):
            start = sowing + timedelta(days=offset)
            names = [s.name for s in stages_in_window(crop, sowing, start, 15)]
            label = ", ".join(names)
            for hazard in query_vectors.HAZARDS:
                assert query_vectors.query_text(crop, hazard, label) in queries


class FakePool:
    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self.rows = rows
        self.sql: list[str] = []
        self.args: list[tuple[Any, ...]] = []

    async def fetch(self, sql: str, *args: Any) -> list[dict[str, Any]]:
        self.sql.append(sql)
        self.args.append(args)
        return self.rows


TEST_ROW = {"id": "c1", "score": 0.5}


async def test_retrieval_with_a_precomputed_vector_uses_the_hybrid_query(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    pool = FakePool([TEST_ROW])
    vector = np.zeros(384, dtype=np.float32)
    monkeypatch.setattr(db, "pool", lambda: pool)
    monkeypatch.setattr(retriever, "lookup", lambda _: vector)
    await retriever.retrieve("PB_LUDHIANA", ["dry_spell"], "wheat", "q")
    assert pool.sql == [retriever.SQL]
    assert pool.args[0][0] is vector


async def test_retrieval_without_a_vector_uses_full_text_and_never_the_model(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def must_not_load() -> None:
        raise AssertionError("the API must not load the embedding model")

    pool = FakePool([TEST_ROW])
    monkeypatch.setattr(db, "pool", lambda: pool)
    monkeypatch.setattr(retriever, "lookup", lambda _: None)
    monkeypatch.setattr("app.rag.embed._model", must_not_load)
    out = await retriever.retrieve("PB_LUDHIANA", ["dry_spell"], "wheat", "q")
    assert pool.sql == [retriever.SQL_KEYWORD]
    assert out[0]["id"] == "c1"


def _use_vectors_file(monkeypatch: pytest.MonkeyPatch, path: Path) -> None:
    monkeypatch.setattr(get_settings(), "query_vectors_path", str(path))
    query_vectors._table.cache_clear()


def test_vectors_file_round_trip_and_missing_file(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    path = tmp_path / "vectors.npz"
    _use_vectors_file(monkeypatch, path)
    assert query_vectors.lookup("q") is None  # no file: the retriever falls back to full text
    query_vectors._table.cache_clear()
    np.savez_compressed(
        path,
        model=np.array(get_settings().embed_model),
        queries=np.array(["q"]),
        vectors=np.ones((1, 3), dtype=np.float32),
    )
    found = query_vectors.lookup("q")
    assert found is not None and found.tolist() == [1.0, 1.0, 1.0]
    assert query_vectors.lookup("not in the file") is None
    query_vectors._table.cache_clear()


def test_vectors_from_another_model_are_ignored(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    path = tmp_path / "vectors.npz"
    _use_vectors_file(monkeypatch, path)
    np.savez_compressed(
        path,
        model=np.array("some-other-model"),
        queries=np.array(["q"]),
        vectors=np.ones((1, 3), dtype=np.float32),
    )
    assert query_vectors.lookup("q") is None
    query_vectors._table.cache_clear()


# ------------------------------------------------------------------ dead runs are closed
class FakeConn:
    def __init__(self, claimed: Any) -> None:
        self.claimed = claimed
        self.rows: list[tuple[Any, ...]] = []

    def transaction(self) -> "FakeConn":
        return self

    async def __aenter__(self) -> "FakeConn":
        return self

    async def __aexit__(self, *_: Any) -> None:
        return None

    async def fetchval(self, *_: Any) -> Any:
        return self.claimed

    async def executemany(self, _: str, rows: list[tuple[Any, ...]]) -> None:
        self.rows.extend(rows)


class ReapPool:
    def __init__(self, stale: list[dict[str, Any]], claimed: Any = "a1") -> None:
        self.stale = stale
        self.conn = FakeConn(claimed)
        self.args: tuple[Any, ...] = ()

    async def fetch(self, _: str, *args: Any) -> list[dict[str, Any]]:
        self.args = args
        return self.stale

    def acquire(self) -> FakeConn:
        return self.conn


TEST_STALE = {"id": "a1", "last_seq": 11, "created_at": datetime.now(UTC) - timedelta(minutes=5)}


async def test_reaper_ends_a_dead_run_with_error_then_done(monkeypatch: pytest.MonkeyPatch) -> None:
    pool = ReapPool([TEST_STALE])
    monkeypatch.setattr(db, "pool", lambda: pool)
    assert await persist.reap_stale_runs("a1") == 1
    assert pool.args[0] == "a1"
    (err, done) = pool.conn.rows
    assert (err[1], err[3]) == (12, "error")  # continues the run's own numbering
    assert err[8]["code"] == "RunInterrupted"
    assert (done[1], done[3]) == (13, "done")
    assert done[8]["status"] == "failed"
    assert set(done[8]) == {"status", "result_url", "duration_ms", "degraded"}
    assert done[8]["duration_ms"] >= 299_000


async def test_reaper_skips_a_run_another_process_already_closed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    pool = ReapPool([TEST_STALE], claimed=None)
    monkeypatch.setattr(db, "pool", lambda: pool)
    assert await persist.reap_stale_runs() == 0
    assert pool.conn.rows == []


async def test_reaper_tolerates_a_database_that_is_down() -> None:
    assert await persist.reap_stale_runs() == 0  # conftest: no database is reachable


def test_silence_limit_outlasts_every_step_budget() -> None:
    assert persist.STALE_RUNNING_S > graph.TOOL_TIMEOUT_S
    assert persist.STALE_RUNNING_S > sum(llm.BUDGET_S.values())


# ------------------------------------------------------------------ trace writes do not block
class SlowPool:
    def __init__(self) -> None:
        self.release = asyncio.Event()
        self.seqs: list[int] = []

    async def executemany(self, _: str, rows: list[tuple[Any, ...]]) -> None:
        await self.release.wait()
        self.seqs.extend(r[1] for r in rows)


async def test_emit_does_not_wait_for_the_database_but_done_does(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    pool = SlowPool()
    monkeypatch.setattr(db, "pool", lambda: pool)
    trace = Trace("a1")
    await asyncio.wait_for(
        trace.emit("node_started", "intake"), 1
    )  # returns with the write pending
    await asyncio.wait_for(trace.emit("node_started", "plan"), 1)
    done = asyncio.create_task(trace.emit("done", "finalize"))
    await asyncio.sleep(0.01)
    assert not done.done() and pool.seqs == []
    pool.release.set()
    await asyncio.wait_for(done, 1)
    assert pool.seqs == [1, 2, 3]  # in order, and all written before `done` returns


async def test_a_failed_trace_write_does_not_break_the_run(monkeypatch: pytest.MonkeyPatch) -> None:
    class Broken:
        async def executemany(self, *_: Any) -> None:
            raise ConnectionError("lost")

    monkeypatch.setattr(db, "pool", lambda: Broken())
    trace = Trace("a1")
    await trace.emit("done", "finalize")
    assert trace.events[-1]["event"] == "done"


# ------------------------------------------------------------------ time limits
async def test_run_past_the_hard_deadline_reports_failed(monkeypatch: pytest.MonkeyPatch) -> None:
    class Hangs:
        async def ainvoke(self, *_: Any, **__: Any) -> dict[str, Any]:
            await asyncio.sleep(60)
            return {}

    failures: list[str] = []

    async def fail(_: str, message: str) -> None:
        failures.append(message)

    async def noop(*_: Any) -> None:
        return None

    monkeypatch.setattr(graph, "GRAPH", Hangs())
    monkeypatch.setattr(graph, "RUN_DEADLINE_S", 0.01)
    trace = Trace("a1", persist=False)
    deps = {"mark_running": noop, "persist_failure": fail}
    out = await graph.run_assessment("a1", {"id": "f"}, None, "en", trace=trace, deps=deps)
    assert out == {"status": "failed"}
    assert [e["event"] for e in trace.events] == ["error", "done"]
    assert "did not finish" in failures[0]


async def test_runs_beyond_the_slot_limit_wait_their_turn(monkeypatch: pytest.MonkeyPatch) -> None:
    active = {"now": 0, "peak": 0}

    class Counts:
        async def ainvoke(self, *_: Any, **__: Any) -> dict[str, Any]:
            active["now"] += 1
            active["peak"] = max(active["peak"], active["now"])
            await asyncio.sleep(0.01)
            active["now"] -= 1
            return {"status": "completed"}

    async def noop(*_: Any) -> None:
        return None

    monkeypatch.setattr(graph, "GRAPH", Counts())
    monkeypatch.setattr(graph, "_RUN_SLOTS", asyncio.Semaphore(2))
    await asyncio.gather(
        *(
            graph.run_assessment(
                f"a{i}",
                {"id": "f"},
                None,
                "en",
                trace=Trace(f"a{i}", persist=False),
                deps={"mark_running": noop},
            )
            for i in range(5)
        )
    )
    assert active["peak"] == 2


async def test_draft_past_the_soft_budget_skips_the_llm_for_the_rule_based_plan() -> None:
    async def must_not_run(*_: Any) -> None:
        raise AssertionError("no LLM call after the budget is spent")

    trace = Trace("a1", persist=False)
    trace._started -= graph.SOFT_BUDGET_S + 1
    config: Any = {"configurable": {"trace": trace, "deps": {"draft": must_not_run}}}
    state: Any = {"passages": [{"id": "p"}], "draft_attempts": 0}
    out = await graph.draft(state, config)
    assert out == {"draft": None, "draft_attempts": graph.MAX_DRAFTS}
    assert trace.events[-1]["event"] == "gate_failed"
    assert graph.after_draft(out) == "rule_based"  # type: ignore[arg-type]


async def test_gather_gives_up_on_a_hung_tool_without_losing_the_others(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def hangs(_: Any) -> Any:
        await asyncio.sleep(60)

    async def quick(_: Any) -> Any:
        return graph.ToolOutput([], None)

    monkeypatch.setattr(graph, "TOOL_TIMEOUT_S", 0.01)
    trace = Trace("a1", persist=False)
    config: Any = {
        "configurable": {
            "trace": trace,
            "deps": {"registry": {"s2_sentinel_hub": hangs, "climatology_imd": quick}},
        }
    }
    state: Any = {
        "to_run": ["optical", "climatology"],
        "chains": {"optical": ["s2_sentinel_hub"], "climatology": ["climatology_imd"]},
        "source_idx": {"optical": 0, "climatology": 0},
        "results": {},
        "ctx": {},
    }
    out = await graph.gather(state, config)
    assert out["results"]["optical"]["status"] == "error"
    assert "no answer within" in out["results"]["optical"]["error"]
    assert out["results"]["climatology"]["status"] == "ok"


async def test_raster_tools_run_one_at_a_time_and_others_run_in_parallel() -> None:
    running = {"raster": 0, "raster_peak": 0, "all": 0, "all_peak": 0}

    def tool(raster: bool) -> Any:
        async def call(_: Any) -> Any:
            running["all"] += 1
            running["all_peak"] = max(running["all_peak"], running["all"])
            if raster:
                running["raster"] += 1
                running["raster_peak"] = max(running["raster_peak"], running["raster"])
            await asyncio.sleep(0.01)
            running["all"] -= 1
            if raster:
                running["raster"] -= 1
            return graph.ToolOutput([], None)

        return call

    registry = {
        "s2_planetary": tool(True),
        "s1_planetary": tool(True),
        "recent_open_meteo": tool(False),
        "climatology_imd": tool(False),
        "ecmwf_ensemble": tool(False),
    }
    chains = {
        "optical": ["s2_planetary"],
        "radar": ["s1_planetary"],
        "antecedent": ["recent_open_meteo"],
        "climatology": ["climatology_imd"],
        "forecast": ["ecmwf_ensemble"],
    }
    config: Any = {
        "configurable": {"trace": Trace("a1", persist=False), "deps": {"registry": registry}}
    }
    state: Any = {
        "to_run": list(chains),
        "chains": chains,
        "source_idx": dict.fromkeys(chains, 0),
        "results": {},
        "ctx": {},
    }
    await graph.gather(state, config)
    assert running["raster_peak"] == 1
    assert running["all_peak"] >= 4


# ------------------------------------------------------------------ an LLM out of quota
async def test_failed_gemini_is_skipped_on_the_next_run(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[str] = []

    async def gemini(*_: Any) -> dict[str, Any]:
        calls.append("gemini")
        raise SourceUnavailable("gemini", "429 RESOURCE_EXHAUSTED")

    async def groq(*_: Any) -> dict[str, Any]:
        calls.append("groq")
        return {"summary": "test input", "actions": []}

    monkeypatch.setattr(llm, "_gemini", gemini)
    monkeypatch.setattr(llm, "_groq", groq)
    field = {"crop": "wheat", "sowing_date": "2026-10-01", "district_code": "PB_LUDHIANA"}
    await llm.draft_plan(field, [], {}, [], "en")
    assert calls == ["gemini", "groq"]
    calls.clear()
    await llm.draft_plan(field, [], {}, [], "hi")
    assert calls == ["groq"]


async def test_groq_is_still_tried_during_its_own_cooldown(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[str] = []

    async def gemini(*_: Any) -> dict[str, Any]:
        raise SourceUnavailable("gemini", "down")

    async def groq(*_: Any) -> dict[str, Any]:
        calls.append("groq")
        raise SourceUnavailable("groq", "down")

    monkeypatch.setattr(llm, "_gemini", gemini)
    monkeypatch.setattr(llm, "_groq", groq)
    field = {"crop": "wheat", "sowing_date": "2026-10-01", "district_code": "PB_LUDHIANA"}
    for _ in range(2):
        with pytest.raises(SourceUnavailable):
            await llm.draft_plan(field, [], {}, [], "en")
    assert calls == ["groq", "groq"]


# ------------------------------------------------------------------ errors reach the browser
def test_unhandled_error_keeps_cors_headers_so_the_browser_can_read_it() -> None:
    from fastapi import FastAPI

    tiny = FastAPI()
    errors.install(tiny)

    @tiny.get("/boom")
    async def boom() -> None:
        raise RuntimeError("test input")

    client = TestClient(tiny, raise_server_exceptions=False)
    response = client.get("/boom", headers={"Origin": "https://khetikavach.pages.dev"})
    assert response.status_code == 500
    assert response.headers["access-control-allow-origin"] == "*"
    assert "access-control-allow-origin" not in client.get("/boom").headers


def test_start_up_reaps_without_a_database() -> None:
    with TestClient(app) as client:
        assert client.get("/docs").status_code == 200
