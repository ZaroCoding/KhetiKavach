"""GET /api/geocode. Stub: validates `q`, then returns 501."""

from typing import Annotated

from fastapi import APIRouter, Query

from app.errors import error_responses, not_implemented
from app.schemas.misc import GeocodeResult

router = APIRouter(prefix="/api", tags=["geocode"])


@router.get(
    "/geocode",
    response_model=list[GeocodeResult],
    responses=error_responses(422, 501, 503),
    summary="Village/place search, proxied to Nominatim (India only)",
)
def geocode(
    q: Annotated[str, Query(min_length=1, pattern=r"\S", description="Search text")],
) -> list[GeocodeResult]:
    not_implemented("GET /api/geocode")
