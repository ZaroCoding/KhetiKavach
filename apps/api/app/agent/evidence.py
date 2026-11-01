"""Builds contract Evidence objects, plus the Source list and data_freshness derived from them.

Every value keeps the provenance of the FetchResult it came from (CLAUDE.md hard rule 2).
Archive-type sources (IMD, ERA5-Land, archived runs) are labelled `archived`.
"""

from datetime import UTC, date, datetime, time
from typing import Any

from app.connectors.base import FetchResult
from app.schemas import (
    ATTRIBUTION,
    DataFreshness,
    Evidence,
    FreshnessItem,
    SeriesPoint,
    Source,
)

ARCHIVE_SOURCES = {"open_meteo_archive", "open_meteo_single_runs", "imd_gridded"}


def _status(fetched: FetchResult | None, source: str) -> str:
    if source in ARCHIVE_SOURCES:
        return "archived"
    return fetched.status if fetched else "live"


def _ts(d: date | datetime) -> datetime:
    return d if isinstance(d, datetime) else datetime.combine(d, time(0, 0), tzinfo=UTC)


class EvidenceBook:
    def __init__(self) -> None:
        self.items: list[Evidence] = []
        self._ids: set[str] = set()

    def _id(self, source: str, variable: str) -> str:
        base = f"{source}:{variable}"
        ident, n = base, 2
        while ident in self._ids:
            ident, n = f"{base}:{n}", n + 1
        self._ids.add(ident)
        return ident

    def value(
        self,
        variable: str,
        value: float | None,
        unit: str | None,
        source: str,
        fetched: FetchResult | None,
    ) -> str:
        ident = self._id(source, variable)
        self.items.append(
            Evidence(
                id=ident,
                variable=variable,
                value=None if value is None else float(value),
                unit=unit,
                source=source,
                source_url=fetched.request_url if fetched else None,
                fetched_at=fetched.fetched_at if fetched else datetime.now(UTC),
                status=_status(fetched, source),
            )
        )
        return ident

    def series(
        self,
        variable: str,
        points: list[tuple[date | datetime, float]],
        unit: str | None,
        source: str,
        fetched: FetchResult | None,
    ) -> str:
        ident = self._id(source, variable)
        self.items.append(
            Evidence(
                id=ident,
                variable=variable,
                unit=unit,
                series=[SeriesPoint(ts=_ts(d), value=float(v)) for d, v in points],
                source=source,
                source_url=fetched.request_url if fetched else None,
                fetched_at=fetched.fetched_at if fetched else datetime.now(UTC),
                status=_status(fetched, source),
            )
        )
        return ident

    def unavailable(self, variable: str, source: str) -> str:
        ident = self._id(source, variable)
        self.items.append(
            Evidence(
                id=ident,
                variable=variable,
                value=None,
                unit=None,
                source=source,
                fetched_at=datetime.now(UTC),
                status="unavailable",
            )
        )
        return ident

    def numbers(self) -> dict[str, Any]:
        """Point values by id, for the LLM prompt and the verifier."""
        return {e.id: e.value for e in self.items if e.value is not None}

    def any_unavailable(self) -> bool:
        return any(e.status == "unavailable" for e in self.items)

    def sources(self) -> list[Source]:
        latest: dict[str, Evidence] = {}
        for e in self.items:
            cur = latest.get(e.source)
            if cur is None or e.fetched_at > cur.fetched_at:
                latest[e.source] = e
        return [
            Source(
                name=e.source,
                url=e.source_url,
                status=e.status,
                fetched_at=e.fetched_at,
                attribution=ATTRIBUTION[e.source],
            )
            for e in latest.values()
        ]

    def freshness(self) -> DataFreshness:
        real = [e for e in self.items if e.status != "unavailable"]
        per = {
            s.name: FreshnessItem(fetched_at=s.fetched_at, status=s.status) for s in self.sources()
        }
        return DataFreshness(
            oldest_fetched_at=min((e.fetched_at for e in real), default=None),
            newest_fetched_at=max((e.fetched_at for e in real), default=None),
            per_source=per,
        )
