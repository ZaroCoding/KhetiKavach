"""Fixed domain constants: the two pilot districts and the coarse India extent.

District codes, names, plan files and bboxes come from docs/CONTRACTS.md (GET /api/districts).
bboxes are the extents of the DataMeet Census 2011 district polygons (CC BY 2.5 IN; attribution:
"DataMeet (Census of India 2011 boundaries), CC BY 2.5 IN").
"""

from dataclasses import dataclass

# Coarse [min_lon, min_lat, max_lon, max_lat] extent of India. Used only as a first geographic
# gate; the district bbox is the authoritative scope check.
INDIA_BBOX: tuple[float, float, float, float] = (68.1, 6.5, 97.4, 37.1)

# Field area limit, hectares (CONTRACTS.md, POST /api/fields).
MAX_FIELD_AREA_HA = 50.0


@dataclass(frozen=True)
class DistrictSpec:
    code: str
    name: str
    state: str
    plan_file: str
    plan_year: int
    bbox: tuple[float, float, float, float]


DISTRICTS: tuple[DistrictSpec, ...] = (
    DistrictSpec(
        code="PUNJAB5",
        name="Ludhiana",
        state="Punjab",
        plan_file="PUNJAB 5-Ludhiana 30.04.2011.pdf",
        plan_year=2011,
        bbox=(75.355427, 30.559983, 76.374883, 31.01921),
    ),
    DistrictSpec(
        code="KA7",
        name="Dharwad",
        state="Karnataka",
        plan_file="KA7-Dharwad 3.2.2011.pdf",
        plan_year=2011,
        bbox=(74.727062, 15.037684, 75.556356, 15.702168),
    ),
)

DISTRICT_CODES: tuple[str, ...] = tuple(d.code for d in DISTRICTS)


def district_by_code(code: str) -> DistrictSpec | None:
    for district in DISTRICTS:
        if district.code == code:
            return district
    return None
