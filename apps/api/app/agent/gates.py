"""Quality gates: is a tool result good enough, and if not, what next?

Actions: accept (use it, maybe marked degraded) | next_source (try the next source in the chain)
| add_radar (optical is cloud-blind: keep the last clear scene and fetch Sentinel-1 radar).
`check` is one of the contract's gate checks: cloud | staleness | gaps | error (B-4).
"""

from dataclasses import dataclass
from datetime import UTC, date, datetime
from typing import Any

from app.connectors.satellite import optical_summary


@dataclass
class GateResult:
    ok: bool
    action: str = "accept"
    check: str | None = None
    reason: str | None = None


def check(
    group: str,
    result: dict[str, Any],
    *,
    has_next: bool,
    as_of: date,
    live: bool,
    max_cloud: float,
    max_optical_age_days: int,
    max_weather_age_hours: int,
    radar_planned: bool,
) -> GateResult:
    nxt = "next_source" if has_next else "accept"
    if result.get("status") == "error":
        return GateResult(False, nxt, "error", f"source failed: {result.get('error')}")
    data = result.get("data")
    fetched = result.get("fetched")
    if data is None:
        return GateResult(False, nxt, "gaps", "tool returned no data")

    if group in ("forecast", "cross_check"):
        members, days = data.members.shape
        need = {"ensemble": 10, "multi_model": 2}.get(data.method, 1)
        if members < need or days < 7:
            return GateResult(False, nxt, "gaps", f"only {members} members x {days} days returned")
        if live and fetched is not None:
            age_h = (datetime.now(UTC) - fetched.fetched_at).total_seconds() / 3600
            if age_h > max_weather_age_hours:
                return GateResult(
                    False,
                    nxt,
                    "staleness",
                    f"forecast is {age_h:.0f} h old (limit {max_weather_age_hours} h)",
                )
        return GateResult(True)

    if group == "optical":
        if not data:
            return GateResult(False, nxt, "gaps", "no observations")
        summ = optical_summary(data, as_of, max_cloud)
        clear, latest, age = (
            summ.get("latest_clear"),
            summ.get("latest_scene"),
            summ.get("age_days"),
        )
        if clear is None or (age is not None and age > max_optical_age_days):
            if latest is not None and age is not None:
                reason = (
                    f"latest scene {latest['date']} is {float(latest['cloud_frac']):.0%} cloud "
                    f"over the field; last clear scene is {age} days old"
                )
            else:
                reason = "no cloud-free scene over this field"
            # Another optical source sees the same clouds, so switching will not help: add radar.
            return GateResult(False, "accept" if radar_planned else "add_radar", "cloud", reason)
        return GateResult(True)

    if group == "antecedent" and getattr(data, "rain_last_30d_mm", None) is None:
        return GateResult(False, nxt, "gaps", "fewer than 25 days of recent rainfall returned")
    return GateResult(True)
