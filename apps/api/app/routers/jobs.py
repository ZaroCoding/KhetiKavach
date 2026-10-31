"""POST /api/jobs/monitor. Stub: checks X-Admin-Key and body, then returns 501."""

from fastapi import APIRouter, Depends

from app.errors import error_responses, not_implemented
from app.schemas.misc import MonitorRequest, MonitorResult
from app.security import require_admin_key

router = APIRouter(prefix="/api", tags=["jobs"])


@router.post(
    "/jobs/monitor",
    response_model=MonitorResult,
    responses=error_responses(401, 422, 501),
    dependencies=[Depends(require_admin_key)],
    summary="Re-assess monitored fields and send alerts",
)
def run_monitor(body: MonitorRequest | None = None) -> MonitorResult:
    not_implemented("POST /api/jobs/monitor")
