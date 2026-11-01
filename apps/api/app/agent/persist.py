"""Write assessment state to Postgres."""

import logging
from typing import Any

from app import db

log = logging.getLogger("persist")


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
