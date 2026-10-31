"""GET /api/districts. Stub: returns 501 until its implementing prompt lands."""

from fastapi import APIRouter

from app.errors import error_responses, not_implemented
from app.schemas.fields import District

router = APIRouter(prefix="/api", tags=["districts"])


@router.get(
    "/districts",
    response_model=list[District],
    responses=error_responses(501),
    summary="List the two pilot districts",
)
def list_districts() -> list[District]:
    not_implemented("GET /api/districts")
