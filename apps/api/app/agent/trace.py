"""Trace events (CONTRACTS.md "SSE events", ruling B-4). Each event is an agent_steps row; the SSE
route replays and tails that table, so the stream works across instances and survives reconnects.

Rows are written in order by one background task, so the agent does not wait on a database round
trip at every step. `done` waits for everything before it, so a client that sees `done` has seen
the whole run.
"""

import asyncio
import logging
import time
from datetime import UTC, datetime
from typing import Any

log = logging.getLogger("trace")

DEFAULT_STATUS = {
    "node_started": "started",
    "tool_result": "succeeded",
    "gate_failed": "failed",
    "fallback_used": "retried",
    "verifier_rejected": "failed",
    "done": "succeeded",
    "error": "failed",
}

INSERT_STEP = """INSERT INTO agent_steps(assessment_id, seq, ts, event, node, tool, status,
                   latency_ms, detail)
                 VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9)"""


class Trace:
    def __init__(self, assessment_id: str, persist: bool = True):
        self.assessment_id = assessment_id
        self.persist = persist
        self.events: list[dict[str, Any]] = []
        self.fallbacks = 0
        self._seq = 0
        self._started = time.perf_counter()
        self._unwritten: list[dict[str, Any]] = []
        self._writer: asyncio.Task[None] | None = None

    def restart_clock(self) -> None:
        """Start timing now: time spent queued for a run slot is not the run's own."""
        self._started = time.perf_counter()

    def elapsed_ms(self) -> int:
        """Milliseconds since the run began: the `duration_ms` the `done` event must carry."""
        return int((time.perf_counter() - self._started) * 1000)

    async def _write_all(self) -> None:
        from app import db

        while self._unwritten:
            batch, self._unwritten = self._unwritten, []
            try:
                await db.pool().executemany(
                    INSERT_STEP,
                    [
                        (
                            self.assessment_id,
                            r["seq"],
                            r["ts"],
                            r["event"],
                            r["node"],
                            r["tool"],
                            r["status"],
                            r["latency_ms"],
                            r["detail"],
                        )
                        for r in batch
                    ],
                )
            except Exception as exc:
                log.warning("trace persist failed: %s", exc)

    async def flush(self) -> None:
        """Wait until every event emitted so far is in the database."""
        while self._writer is not None and not self._writer.done():
            await asyncio.shield(self._writer)

    async def emit(
        self,
        event: str,
        node: str | None,
        *,
        tool: str | None = None,
        status: str | None = None,
        latency_ms: int | None = None,
        detail: dict[str, Any] | None = None,
    ) -> None:
        self._seq += 1
        if event == "fallback_used":
            self.fallbacks += 1
        row = {
            "seq": self._seq,
            "ts": datetime.now(UTC),
            "event": event,
            "node": node,
            "tool": tool,
            "status": status or DEFAULT_STATUS[event],
            "latency_ms": latency_ms,
            "detail": detail or {},
        }
        self.events.append(row)
        log.info("trace %s #%d %s %s %s", self.assessment_id[:8], self._seq, event, node, tool)
        if not self.persist:
            return
        self._unwritten.append(row)
        if self._writer is None or self._writer.done():
            self._writer = asyncio.create_task(self._write_all())
        if event == "done":
            await self.flush()
