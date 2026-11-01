"""POST /api/fields and GET /api/fields (CONTRACTS.md)."""

import json
import secrets
import string
from typing import Any

from fastapi import APIRouter, Query

from app import db
from app.agent.tools import today_utc
from app.districts import DISTRICTS
from app.errors import ApiError, validation_error
from app.geo.validate import (
    FieldValidationError,
    check_in_district,
    validate_polygon,
    validate_sowing_date,
)
from app.routers.districts import district_bbox
from app.schemas import FieldCreate, FieldOut

router = APIRouter(prefix="/api")
ALPHABET = string.ascii_uppercase + string.digits
SELECT = """SELECT id::text AS id, short_code, name, ST_AsGeoJSON(geom) AS geojson, crop,
                   sowing_date, district_code, created_at FROM fields"""


def row_to_field(r: Any) -> FieldOut:
    return FieldOut(
        id=r["id"],
        short_code=r["short_code"],
        name=r["name"],
        geometry=json.loads(r["geojson"]),
        crop=r["crop"],
        sowing_date=r["sowing_date"],
        district_code=r["district_code"],
        created_at=r["created_at"],
    )


@router.post("/fields", response_model=FieldOut, status_code=201)
async def create_field(body: FieldCreate) -> FieldOut:
    district = DISTRICTS.get(body.district_code)
    if district is None:
        raise validation_error(
            "district_code", f"unknown district_code; use one of {', '.join(DISTRICTS)}"
        )
    try:
        valid = validate_polygon(body.geometry.model_dump())
        validate_sowing_date(body.sowing_date, today_utc())
        bbox = await district_bbox(body.district_code)
        if bbox is None:
            raise ApiError(503, "district boundary lookup unavailable and nothing cached; retry")
        names = " and ".join(d.name for d in DISTRICTS.values())
        check_in_district(valid, bbox, district.name, names)
    except FieldValidationError as exc:
        raise validation_error(exc.field, exc.reason) from exc
    code = "".join(secrets.choice(ALPHABET) for _ in range(6))
    row = await db.pool().fetchrow(
        """INSERT INTO fields(short_code, name, geom, crop, sowing_date, district_code)
           VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326), $4, $5, $6)
           RETURNING id::text AS id""",
        code,
        body.name,
        json.dumps(body.geometry.model_dump()),
        body.crop,
        body.sowing_date,
        body.district_code,
    )
    created = await db.pool().fetchrow(SELECT + " WHERE id = $1::uuid", row["id"])
    return row_to_field(created)


@router.get("/fields", response_model=list[FieldOut])
async def list_fields(district_code: str | None = Query(default=None)) -> list[FieldOut]:
    if district_code is not None and district_code not in DISTRICTS:
        raise validation_error("district_code", "unknown district_code")
    if district_code:
        rows = await db.pool().fetch(
            SELECT + " WHERE district_code = $1 ORDER BY created_at DESC LIMIT 200", district_code
        )
    else:
        rows = await db.pool().fetch(SELECT + " ORDER BY created_at DESC LIMIT 200")
    return [row_to_field(r) for r in rows]
