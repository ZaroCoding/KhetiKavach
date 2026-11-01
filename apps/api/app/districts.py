"""The two demo districts (ruling B-1). Coordinates are never typed here: bounding boxes come from
OpenStreetMap via the nominatim connector and are served with their source."""

from dataclasses import dataclass


@dataclass(frozen=True)
class DistrictInfo:
    code: str
    name: str
    state: str
    boundary_query: str  # Nominatim search text for the district boundary
    plan_file: str  # file in data/
    plan_title: str
    plan_year: int


DISTRICTS: dict[str, DistrictInfo] = {
    "PB_LUDHIANA": DistrictInfo(
        code="PB_LUDHIANA",
        name="Ludhiana",
        state="Punjab",
        boundary_query="Ludhiana district, Punjab, India",
        plan_file="PUNJAB 5-Ludhiana 30.04.2011.pdf",
        plan_title="District Agriculture Contingency Plan: Ludhiana, Punjab",
        plan_year=2011,
    ),
    "KA_DHARWAD": DistrictInfo(
        code="KA_DHARWAD",
        name="Dharwad",
        state="Karnataka",
        boundary_query="Dharwad district, Karnataka, India",
        plan_file="KA7-Dharwad 3.2.2011.pdf",
        plan_title="District Agriculture Contingency Plan: Dharwad, Karnataka",
        plan_year=2011,
    ),
}
