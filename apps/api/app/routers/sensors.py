"""POST /api/sensors/ingest (P1). Stub: checks X-Device-Key presence and body, then 501."""

from fastapi import APIRouter, Depends

from app.errors import error_responses, not_implemented
from app.schemas.misc import ReceivedResponse, SensorIngest
from app.security import require_device_key

router = APIRouter(prefix="/api", tags=["sensors"])


@router.post(
    "/sensors/ingest",
    status_code=202,
    response_model=ReceivedResponse,
    responses=error_responses(401, 422, 501),
    dependencies=[Depends(require_device_key)],
    summary="Ingest one soil/temperature/humidity reading from a device (P1)",
)
def ingest_sensor(body: SensorIngest) -> ReceivedResponse:
    not_implemented("POST /api/sensors/ingest")
