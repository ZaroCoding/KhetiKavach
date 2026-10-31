"""Schema rules from docs/CONTRACTS.md that are enforced by the Pydantic models.

Test inputs only (CLAUDE.md logic-test inputs): values are hand-built and their expected results
are derivable by hand.
"""

from datetime import UTC, datetime

import pytest
from pydantic import TypeAdapter, ValidationError

from app.models import Base
from app.schemas.common import Evidence, EvidenceStatus, SourceName
from app.schemas.events import SseEvent

NOW = datetime(2026, 10, 1, 6, 0, tzinfo=UTC)


def _evidence(**overrides: object) -> dict[str, object]:
    base: dict[str, object] = {
        "id": "ev-1",
        "variable": "precip_mm_daily",
        "unit": "mm",
        "source": "open_meteo_forecast",
        "source_url": None,
        "fetched_at": NOW.isoformat(),
        "status": "live",
        "value": 12.5,
    }
    base.update(overrides)
    return base


def test_scalar_evidence_serialises_with_value_and_no_series_key() -> None:
    dumped = Evidence.model_validate(_evidence()).model_dump(mode="json")
    assert dumped["value"] == 12.5
    assert "series" not in dumped
    assert dumped["source"] == "open_meteo_forecast"
    assert dumped["status"] == "live"


def test_series_evidence_omits_value_key() -> None:
    series = [{"ts": NOW.isoformat(), "value": 3.0}, {"ts": NOW.isoformat(), "value": 4.5}]
    evidence = Evidence.model_validate(_evidence(value=None, series=series))
    dumped = evidence.model_dump(mode="json")
    assert "value" not in dumped
    assert dumped["series"][1]["value"] == 4.5


def test_unavailable_evidence_has_null_value_and_is_accepted() -> None:
    evidence = Evidence.model_validate(_evidence(value=None, status="unavailable"))
    assert evidence.status is EvidenceStatus.unavailable
    assert evidence.model_dump(mode="json")["value"] is None


def test_unavailable_evidence_carrying_a_value_is_rejected() -> None:
    with pytest.raises(ValidationError, match="unavailable evidence must not carry"):
        Evidence.model_validate(_evidence(value=1.0, status="unavailable"))


def test_live_evidence_with_neither_value_nor_series_is_rejected() -> None:
    with pytest.raises(ValidationError, match="exactly one of value or series"):
        Evidence.model_validate(_evidence(value=None))


def test_evidence_requires_source_fetched_at_and_status() -> None:
    raw = _evidence()
    for key in ("source", "fetched_at", "status"):
        broken = {k: v for k, v in raw.items() if k != key}
        with pytest.raises(ValidationError):
            Evidence.model_validate(broken)


def test_evidence_rejects_unknown_source_name() -> None:
    with pytest.raises(ValidationError):
        Evidence.model_validate(_evidence(source="made_up_source"))


def test_source_name_enum_has_the_fifteen_contract_values() -> None:
    assert len(SourceName) == 15
    assert "nominatim" in {s.value for s in SourceName}


def test_sse_event_union_selects_the_right_model_by_event_name() -> None:
    frame = {
        "seq": 3,
        "ts": NOW.isoformat(),
        "event": "fallback_used",
        "assessment_id": "3f1c7a8e-2b4d-4c5e-8f9a-0b1c2d3e4f50",
        "node": "fetch_weather",
        "data": {
            "tool": "open_meteo_forecast",
            "status": "succeeded",
            "latency_ms": 812,
            "detail": {
                "from_source": "open_meteo_forecast",
                "to_source": "open_meteo_archive",
                "reason": "timeout",
            },
        },
    }
    event = TypeAdapter(SseEvent).validate_python(frame)
    assert event.event == "fallback_used"
    assert event.data.detail.to_source is SourceName.open_meteo_archive


def test_sse_event_rejects_detail_of_the_wrong_shape() -> None:
    frame = {
        "seq": 4,
        "ts": NOW.isoformat(),
        "event": "gate_failed",
        "assessment_id": "3f1c7a8e-2b4d-4c5e-8f9a-0b1c2d3e4f50",
        "node": "gate",
        "data": {"tool": None, "status": "failed", "latency_ms": None, "detail": {"check": "rain"}},
    }
    with pytest.raises(ValidationError):
        TypeAdapter(SseEvent).validate_python(frame)


def test_agent_steps_table_names_match_the_contract() -> None:
    assert set(Base.metadata.tables) == {
        "fields",
        "observations",
        "api_cache",
        "imd_rain_daily",
        "assessments",
        "agent_steps",
        "doc_chunks",
        "sensor_devices",
        "sensor_readings",
        "alert_subscriptions",
        "alerts_sent",
        "source_switches",
    }
