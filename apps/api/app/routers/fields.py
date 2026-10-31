"""POST and GET /api/fields. Stubs: validate input (422 with reason), then return 501."""

from fastapi import APIRouter

from app.errors import error_responses, not_implemented
from app.schemas.fields import DistrictCode, FieldCreate, FieldOut

router = APIRouter(prefix="/api", tags=["fields"])


@router.post(
    "/fields",
    status_code=201,
    response_model=FieldOut,
    responses=error_responses(422, 501),
    summary="Register a field (polygon, crop, sowing date, district)",
)
def create_field(body: FieldCreate) -> FieldOut:
    not_implemented("POST /api/fields")


@router.get(
    "/fields",
    response_model=list[FieldOut],
    responses=error_responses(422, 501),
    summary="List fields, newest first (capped at 200)",
)
def list_fields(district_code: DistrictCode | None = None) -> list[FieldOut]:
    not_implemented("GET /api/fields")
