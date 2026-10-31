"""Admin source switches. Stubs: check X-Admin-Key and the source name, then return 501."""

from typing import Annotated

from fastapi import APIRouter, Depends, Path

from app.errors import ApiError, error_responses, not_implemented
from app.schemas.common import SourceName
from app.schemas.misc import AdminSourceItem
from app.security import require_admin_key

router = APIRouter(prefix="/api/admin", tags=["admin"])

SourcePath = Annotated[str, Path(description="A SourceName value")]


def _require_known_source(source: str) -> None:
    if source not in {name.value for name in SourceName}:
        raise ApiError(404, "NOT_FOUND", f"unknown source {source!r}")


@router.get(
    "/sources",
    response_model=list[AdminSourceItem],
    responses=error_responses(401, 501),
    dependencies=[Depends(require_admin_key)],
    summary="Disabled state of every source",
)
def list_sources() -> list[AdminSourceItem]:
    not_implemented("GET /api/admin/sources")


@router.post(
    "/sources/{source}/disable",
    response_model=AdminSourceItem,
    responses=error_responses(401, 404, 501),
    dependencies=[Depends(require_admin_key)],
    summary="Disable a source; its connector reports unavailable and falls back",
)
def disable_source(source: SourcePath) -> AdminSourceItem:
    _require_known_source(source)
    not_implemented("POST /api/admin/sources/{source}/disable")


@router.post(
    "/sources/{source}/enable",
    response_model=AdminSourceItem,
    responses=error_responses(401, 404, 501),
    dependencies=[Depends(require_admin_key)],
    summary="Re-enable a previously disabled source",
)
def enable_source(source: SourcePath) -> AdminSourceItem:
    _require_known_source(source)
    not_implemented("POST /api/admin/sources/{source}/enable")
