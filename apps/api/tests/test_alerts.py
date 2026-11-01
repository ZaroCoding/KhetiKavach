"""Alert rule (CONTRACTS.md monitor) and message formatting, with hand-built test inputs."""

from app.alerts.messages import format_alert
from app.routers.ops import alert_due


def test_alert_when_probability_crosses_threshold_or_severity_rises() -> None:
    previous = [
        {"hazard": "dry_spell", "severity": "low"},
        {"hazard": "heavy_rain", "severity": "high"},
    ]
    current = [
        {"hazard": "dry_spell", "severity": "moderate", "probability": 0.3},
        {"hazard": "heavy_rain", "severity": "high", "probability": 0.2},
        {"hazard": "harvest_rain", "severity": "low", "probability": 0.6},
    ]
    due = {r["hazard"] for r in alert_due(current, previous, 0.5)}
    assert due == {"dry_spell", "harvest_rain"}


def test_hindi_alert_keeps_numbers_and_citation() -> None:
    risk = {
        "hazard": "dry_spell",
        "severity": "high",
        "probability": 0.62,
        "window": {"start": "2026-11-01", "end": "2026-11-15"},
    }
    plan = [
        {
            "text": "Apply mulch",
            "when": "2026-11-02",
            "citation": {"doc_title": "Plan", "plan_year": 2011, "page": 20},
        }
    ]
    text = format_alert("Plot 3", risk, plan, "hi")
    assert "62%" in text and "p.20" in text and "उच्च" in text
