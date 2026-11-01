"""GET /api/districts, GET /api/geocode, GET /api/model."""

from typing import Any

from fastapi import APIRouter, Query

from app.connectors import nominatim
from app.connectors.base import SourceUnavailable
from app.districts import DISTRICTS
from app.errors import ApiError
from app.rag.retriever import chunk_counts
from app.risk import model as dry_model
from app.schemas import District, Place

router = APIRouter(prefix="/api")


async def district_bbox(code: str) -> tuple[float, float, float, float] | None:
    try:
        bbox, _ = await nominatim.district_bbox(DISTRICTS[code].boundary_query)
        return bbox
    except (SourceUnavailable, LookupError):
        return None


@router.get("/districts", response_model=list[District])
async def districts() -> list[District]:
    try:
        counts = await chunk_counts()
    except Exception:
        counts = {}
    out = []
    for d in DISTRICTS.values():
        out.append(
            District(
                code=d.code,
                name=d.name,
                state=d.state,
                bbox=await district_bbox(d.code),
                bbox_source="nominatim",
                plan_title=d.plan_title,
                plan_year=d.plan_year,
                plan_chunks=counts.get(d.code, 0),
            )
        )
    return out


@router.get("/geocode", response_model=list[Place])
async def geocode(q: str = Query(min_length=2, max_length=120)) -> list[Place]:
    try:
        places, _ = await nominatim.search_places(q)
    except SourceUnavailable as exc:
        raise ApiError(503, f"place search unavailable: {exc.reason}") from exc
    return [Place(**p) for p in places]


@router.get("/model")
async def model_card() -> dict[str, Any]:
    return dry_model.metrics() or {"status": "not_trained"}
