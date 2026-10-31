"""SSE envelope and event payloads for GET /api/assessments/{id}/stream (CONTRACTS.md, SSE events).

Each event type is its own model so the discriminated union on `event` is exact.
"""

from datetime import datetime
from enum import StrEnum
from typing import Annotated, Generic, Literal, TypeVar
from uuid import UUID

from pydantic import BaseModel, Field, JsonValue

from app.schemas.common import SourceName

D = TypeVar("D")

JsonObject = dict[str, JsonValue]


class StepStatus(StrEnum):
    started = "started"
    succeeded = "succeeded"
    failed = "failed"
    retried = "retried"
    skipped = "skipped"


class StepData(BaseModel, Generic[D]):
    """Mirrors the agent_steps columns. `detail` is typed per event."""

    tool: str | None
    status: StepStatus
    latency_ms: int | None
    detail: D


class ToolResultDetail(BaseModel):
    source: SourceName
    evidence_ids: list[str]


class GateFailedDetail(BaseModel):
    check: Literal["cloud", "staleness", "gaps"]
    reason: str


class FallbackUsedDetail(BaseModel):
    from_source: SourceName
    to_source: SourceName
    reason: str


class VerifierRejectedDetail(BaseModel):
    attempt: int
    item: str
    reason: str


class ErrorPayload(BaseModel):
    code: str
    message: str


class DonePayload(BaseModel):
    status: Literal["completed", "completed_degraded", "failed"]
    result_url: str
    duration_ms: int
    degraded: bool


class SseEnvelopeBase(BaseModel):
    seq: int
    ts: datetime
    assessment_id: UUID
    node: str | None


class NodeStartedEvent(SseEnvelopeBase):
    event: Literal["node_started"]
    data: StepData[JsonObject]


class ToolResultEvent(SseEnvelopeBase):
    event: Literal["tool_result"]
    data: StepData[ToolResultDetail]


class GateFailedEvent(SseEnvelopeBase):
    event: Literal["gate_failed"]
    data: StepData[GateFailedDetail]


class FallbackUsedEvent(SseEnvelopeBase):
    event: Literal["fallback_used"]
    data: StepData[FallbackUsedDetail]


class VerifierRejectedEvent(SseEnvelopeBase):
    event: Literal["verifier_rejected"]
    data: StepData[VerifierRejectedDetail]


class ErrorEvent(SseEnvelopeBase):
    event: Literal["error"]
    data: ErrorPayload


class DoneEvent(SseEnvelopeBase):
    event: Literal["done"]
    data: DonePayload


SseEvent = Annotated[
    NodeStartedEvent
    | ToolResultEvent
    | GateFailedEvent
    | FallbackUsedEvent
    | VerifierRejectedEvent
    | ErrorEvent
    | DoneEvent,
    Field(discriminator="event"),
]
