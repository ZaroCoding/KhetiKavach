"""Trace events (CONTRACTS.md "SSE events", ruling B-4). Each event is an agent_steps row; the SSE
route replays and tails that table, so the stream works across instances and survives reconnects.
"""

import asyncio
import logging
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


class Trace:
    def __init__(self, assessment_id: str, persist: bool = True):
        self.assessment_id = assessment_id
        self.persist = persist
        self.events: list[dict[str, Any]] = []
        self.fallbacks = 0
        self._seq = 0
        self._lock = asyncio.Lock()

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
        async with self._lock:
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
            try:
                from app import db

                await db.pool().execute(
                    """INSERT INTO agent_steps(assessment_id, seq, ts, event, node, tool, status,
                         latency_ms, detail)
                       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9)""",
                    self.assessment_id,
                    row["seq"],
                    row["ts"],
                    event,
                    node,
                    tool,
                    row["status"],
                    latency_ms,
                    row["detail"],
                )
            except Exception as exc:
                log.warning("trace persist failed: %s", exc)
