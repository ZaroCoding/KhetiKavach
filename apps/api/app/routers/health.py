"""Health endpoint. Database status is wired in a later step; it is reported as unknown."""

from importlib.metadata import PackageNotFoundError, version

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    version: str
    db: str


def _package_version() -> str:
    try:
        return version("khetkavach-api")
    except PackageNotFoundError:
        return "unknown"


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", version=_package_version(), db="unknown")
