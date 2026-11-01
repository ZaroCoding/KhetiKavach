"""Assessments: POST starts the agent (202), GET returns the card, /stream is the SSE trace.

Cloud Run: background work after the 202 needs CPU, so deploy with --no-cpu-throttling.
"""

import asyncio
import json
import uuid
from collections.abc import AsyncIterator
from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, Request
from sse_starlette import EventSourceResponse, ServerSentEvent

from app import db
from app.agent.graph import run_assessment
from app.agent.persist import reap_stale_runs
from app.agent.tools import today_utc
from app.errors import ApiError, validation_error
from app.ratelimit import rate_limit
from app.risk.crops import stage_on
from app.schemas import AssessmentAccepted, AssessmentCreate, AssessmentOut

router = APIRouter(prefix="/api")
_tasks: set[asyncio.Task[Any]] = set()  # keep references so tasks are not garbage-collected
EARLIEST_AS_OF = date(2021, 1, 1)
# Each assessment spends upstream quota, and the demo path has no login (ruling B-22).
assessment_limit = rate_limit(10)


def _uuid_or_404(value: str, what: str) -> str:
    try:
        return str(uuid.UUID(value))
    except ValueError as exc:
        raise ApiError(404, f"{what} not found") from exc


async def load_field(field_id: str) -> dict[str, Any] | None:
    r = await db.pool().fetchrow(
        """SELECT id::text AS id, short_code, name, crop, sowing_date, district_code,
                  ST_AsGeoJSON(geom) AS g, ST_Y(ST_Centroid(geom)) AS lat,
                  ST_X(ST_Centroid(geom)) AS lon
           FROM fields WHERE id = $1::uuid""",
        field_id,
    )
    if not r:
        return None
    return {
        "id": r["id"],
        "short_code": r["short_code"],
        "name": r["name"] or r["short_code"],
        "crop": r["crop"],
        "sowing_date": r["sowing_date"],
        "district_code": r["district_code"],
        "geometry": json.loads(r["g"]),
        "lat": float(r["lat"]),
        "lon": float(r["lon"]),
    }


async def create_assessment_row(field_id: str, as_of: date | None, language: str) -> str:
    aid = await db.pool().fetchval(
        """INSERT INTO assessments(field_id, as_of, language) VALUES ($1::uuid, $2, $3)
           RETURNING id::text""",
        field_id,
        as_of,
        language,
    )
    return str(aid)


@router.post(
    "/assessments",
    response_model=AssessmentAccepted,
    status_code=202,
    dependencies=[Depends(assessment_limit)],
)
async def create(body: AssessmentCreate) -> AssessmentAccepted:
    field_id = _uuid_or_404(body.field_id, "field")
    as_of = body.as_of  # checked before the database is touched
    if as_of is not None:
        if as_of > today_utc():
            raise validation_error("as_of", "as_of cannot be in the future")
        if as_of < EARLIEST_AS_OF:
            raise validation_error("as_of", "as_of must be on or after 2021-01-01")
        if as_of == today_utc():
            as_of = None  # ruling B-10: today is live
    field = await load_field(field_id)
    if field is None:
        raise ApiError(404, "field not found")
    if as_of is not None and as_of < field["sowing_date"]:
        raise validation_error("as_of", f"as_of is before the sowing date {field['sowing_date']}")
    aid = await create_assessment_row(field_id, as_of, body.language)
    task = asyncio.create_task(run_assessment(aid, field, as_of, body.language))
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)
    return AssessmentAccepted(
        assessment_id=aid,
        status="queued",
        stream_url=f"/api/assessments/{aid}/stream",
        result_url=f"/api/assessments/{aid}",
    )


EMPTY_FRESHNESS: dict[str, Any] = {
    "oldest_fetched_at": None,
    "newest_fetched_at": None,
    "per_source": {},
}


@router.get("/assessments/{aid}", response_model=AssessmentOut)
async def get_one(aid: str) -> AssessmentOut:
    aid = _uuid_or_404(aid, "assessment")
    r = await db.pool().fetchrow(
        """SELECT a.*, f.crop, f.sowing_date
           FROM assessments a JOIN fields f ON f.id = a.field_id
           WHERE a.id = $1::uuid""",
        aid,
    )
    if not r:
        raise ApiError(404, "assessment not found")
    done = r["status"] in ("completed", "completed_degraded", "failed")
    crop_day = stage_on(r["crop"], r["sowing_date"], r["as_of"] or r["created_at"].date())
    return AssessmentOut(
        id=str(r["id"]),
        field_id=str(r["field_id"]),
        status=r["status"],
        mode="replay" if r["as_of"] else "live",
        as_of=r["as_of"],
        language=r["language"],
        model_version=r["model_version"] if done else None,
        created_at=r["created_at"],
        completed_at=r["completed_at"],
        risks=r["risks"] or [],
        evidence=r["evidence"] or [],
        plan=r["plan"] or [],
        plan_summary=r["plan_summary"],
        plan_generator=r["plan_generator"],
        replay_basis=r["replay_basis"],
        sources=r["sources"] or [],
        data_freshness=r["data_freshness"] or EMPTY_FRESHNESS,
        crop_status=crop_day.status,
        days_after_sowing=crop_day.das,
    )


def _frame(aid: str, row: Any) -> ServerSentEvent:
    envelope = {
        "seq": row["seq"],
        "ts": row["ts"].isoformat(),
        "event": row["event"],
        "assessment_id": aid,
        "node": row["node"],
    }
    if row["event"] in ("done", "error"):
        envelope["data"] = row["detail"]
    else:
        envelope["data"] = {
            "tool": row["tool"],
            "status": row["status"],
            "latency_ms": row["latency_ms"],
            "detail": row["detail"],
        }
    return ServerSentEvent(id=str(row["seq"]), event=row["event"], data=json.dumps(envelope))


@router.get("/assessments/{aid}/stream")
async def stream(aid: str, request: Request) -> EventSourceResponse:
    aid = _uuid_or_404(aid, "assessment")
    exists = await db.pool().fetchval("SELECT 1 FROM assessments WHERE id = $1::uuid", aid)
    if not exists:
        raise ApiError(404, "assessment not found")
    last = int(request.headers.get("last-event-id") or 0)

    async def events() -> AsyncIterator[ServerSentEvent]:
        nonlocal last
        idle = 0
        while not await request.is_disconnected():
            rows = await db.pool().fetch(
                """SELECT seq, ts, event, node, tool, status, latency_ms, detail FROM agent_steps
                   WHERE assessment_id = $1::uuid AND seq > $2 ORDER BY seq""",
                aid,
                last,
            )
            for row in rows:
                last = row["seq"]
                yield _frame(aid, row)
                if row["event"] == "done":
                    return
            idle = 0 if rows else idle + 1
            if idle > 270:  # 4.5 minutes without progress
                return
            if idle and idle % 15 == 0:  # the next poll streams any closing events this writes
                await reap_stale_runs(aid)
            await asyncio.sleep(1.0)

    return EventSourceResponse(
        events(), ping=15, ping_message_factory=lambda: ServerSentEvent(comment="keep-alive")
    )
