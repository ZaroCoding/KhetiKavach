"""Assessment routes. Stubs: validate input, then return 501 (POST, GET card and SSE stream)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Path
from fastapi.responses import Response

from app.errors import ApiError, error_responses, not_implemented
from app.schemas.assessments import AssessmentAccepted, AssessmentCreate, AssessmentOut

router = APIRouter(prefix="/api", tags=["assessments"])

AssessmentId = Annotated[
    str,
    Path(description="Assessment UUID. A non-UUID value is reported as 404, not 422."),
]


def _parse_assessment_id(assessment_id: str) -> None:
    try:
        UUID(assessment_id)
    except ValueError as exc:
        raise ApiError(404, "NOT_FOUND", "assessment not found") from exc


@router.post(
    "/assessments",
    status_code=202,
    response_model=AssessmentAccepted,
    responses=error_responses(404, 422, 501),
    summary="Queue an assessment for a field",
)
def create_assessment(body: AssessmentCreate) -> AssessmentAccepted:
    not_implemented("POST /api/assessments")


@router.get(
    "/assessments/{assessment_id}",
    response_model=AssessmentOut,
    responses=error_responses(404, 501),
    summary="Read an assessment card (200 with empty arrays while queued or running)",
)
def get_assessment(assessment_id: AssessmentId) -> AssessmentOut:
    _parse_assessment_id(assessment_id)
    not_implemented("GET /api/assessments/{id}")


@router.get(
    "/assessments/{assessment_id}/stream",
    response_class=Response,
    responses={
        200: {
            "description": "text/event-stream of SseEvent frames; ends with a done event",
            "content": {"text/event-stream": {"schema": {"$ref": "#/components/schemas/SseEvent"}}},
        },
        **error_responses(404, 501),
    },
    summary="Server-sent events: agent trace for one assessment",
)
def stream_assessment(assessment_id: AssessmentId) -> Response:
    _parse_assessment_id(assessment_id)
    not_implemented("GET /api/assessments/{id}/stream")
