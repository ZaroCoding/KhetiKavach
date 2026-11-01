"""Write assessment state to Postgres."""

import logging
from datetime import UTC, datetime
from typing import Any

from app import db
from app.agent.trace import INSERT_STEP

log = logging.getLogger("persist")

# Longer than any step can stay silent: tools stop at 35 s and one LLM draft at 40 s.
STALE_RUNNING_S = 90.0
# A queued run is waiting for a slot, and it has no steps to prove it is alive.
STALE_QUEUED_S = 300.0
INTERRUPTED = "The server restarted during this run, so it did not finish. Please run it again."


async def mark_running(assessment_id: str) -> None:
    await db.pool().execute(
        "UPDATE assessments SET status = 'running' WHERE id = $1::uuid", assessment_id
    )


async def persist_assessment(state: dict[str, Any], status: str) -> None:
    book = state["book"]
    await db.pool().execute(
        """UPDATE assessments SET status = $2, risks = $3, evidence = $4, plan = $5,
             plan_summary = $6, plan_generator = $7, replay_basis = $8, sources = $9,
             data_freshness = $10, model_version = $11, completed_at = now()
           WHERE id = $1::uuid""",
        state["assessment_id"],
        status,
        [r.model_dump(mode="json") for r in state["risks"]],
        [e.model_dump(mode="json", exclude_none=False) for e in book.items],
        [p.model_dump(mode="json") for p in state["plan"]],
        state.get("plan_summary"),
        state.get("plan_generator"),
        None if state["mode"] == "live" else state["mode"],
        [s.model_dump(mode="json") for s in book.sources()],
        book.freshness().model_dump(mode="json"),
        state.get("model_version"),
    )


async def mark_failed(assessment_id: str, error: str) -> None:
    try:
        await db.pool().execute(
            """UPDATE assessments SET status = 'failed', error = $2, completed_at = now()
               WHERE id = $1::uuid""",
            assessment_id,
            error[:1000],
        )
    except Exception:
        log.exception("could not mark assessment %s failed", assessment_id)


async def reap_stale_runs(assessment_id: str | None = None) -> int:
    """Close runs whose process died, so clients get the usual `error` then `done` (ruling B-4).

    A run lives in one process's memory, so a restart ends it with no chance to record that. Called
    at start-up, and by the SSE stream while a client is watching a run that has gone quiet.
    Returns how many runs were closed; a database problem here is never allowed to break a caller.
    """
    try:
        stale = await db.pool().fetch(
            """SELECT a.id::text AS id, a.created_at, COALESCE(MAX(s.seq), 0) AS last_seq
               FROM assessments a LEFT JOIN agent_steps s ON s.assessment_id = a.id
               WHERE a.status IN ('queued', 'running')
                 AND ($1::uuid IS NULL OR a.id = $1::uuid)
               GROUP BY a.id
               HAVING (a.status = 'running'
                       AND COALESCE(MAX(s.ts), a.created_at)
                           < now() - make_interval(secs => $2))
                   OR (a.status = 'queued' AND a.created_at < now() - make_interval(secs => $3))""",
            assessment_id,
            STALE_RUNNING_S,
            STALE_QUEUED_S,
        )
        closed = 0
        for run in stale:
            async with db.pool().acquire() as conn, conn.transaction():
                claimed = await conn.fetchval(
                    """UPDATE assessments SET status = 'failed', error = $2, completed_at = now()
                       WHERE id = $1::uuid AND status IN ('queued', 'running') RETURNING id""",
                    run["id"],
                    INTERRUPTED,
                )
                if claimed is None:
                    continue
                now = datetime.now(UTC)
                seq = int(run["last_seq"])
                await conn.executemany(
                    INSERT_STEP,
                    [
                        (
                            run["id"],
                            seq + 1,
                            now,
                            "error",
                            "agent",
                            None,
                            "failed",
                            None,
                            {"code": "RunInterrupted", "message": INTERRUPTED},
                        ),
                        (
                            run["id"],
                            seq + 2,
                            now,
                            "done",
                            "finalize",
                            None,
                            "succeeded",
                            None,
                            {
                                "status": "failed",
                                "result_url": f"/api/assessments/{run['id']}",
                                "duration_ms": int(
                                    (now - run["created_at"]).total_seconds() * 1000
                                ),
                                "degraded": False,
                            },
                        ),
                    ],
                )
                closed += 1
        if closed:
            log.warning("closed %d interrupted assessment run(s)", closed)
        return closed
    except Exception as exc:
        log.warning("could not check for interrupted runs: %s", type(exc).__name__)
        return 0
