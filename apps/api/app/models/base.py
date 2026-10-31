"""Declarative base and the enum value sets used in CHECK constraints (docs/CONTRACTS.md)."""

from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


SOURCE_NAMES: tuple[str, ...] = (
    "planetary_computer_s2",
    "planetary_computer_s1",
    "sentinel_hub",
    "open_meteo_ensemble",
    "open_meteo_forecast",
    "open_meteo_archive",
    "open_meteo_historical_forecast",
    "imd_gridded",
    "imd_api",
    "nasa_power",
    "bhuvan",
    "gemini",
    "crida_plans",
    "esp32_sensor",
    "nominatim",
)
CROPS: tuple[str, ...] = ("wheat", "rice", "cotton", "soybean")
LANGUAGES: tuple[str, ...] = ("en", "hi", "pa")
ASSESSMENT_STATUSES: tuple[str, ...] = (
    "queued",
    "running",
    "completed",
    "completed_degraded",
    "failed",
)
STEP_STATUSES: tuple[str, ...] = ("started", "succeeded", "failed", "retried", "skipped")
HAZARDS: tuple[str, ...] = ("dry_spell", "heavy_rain")
SEVERITIES: tuple[str, ...] = ("low", "moderate", "high", "severe")
ALERT_STATUSES: tuple[str, ...] = ("sent", "failed")


def in_list(column: str, values: tuple[str, ...]) -> str:
    """SQL `column IN ('a', 'b', ...)` for a CHECK constraint."""
    quoted = ", ".join(f"'{v}'" for v in values)
    return f"{column} IN ({quoted})"
