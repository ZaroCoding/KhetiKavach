"""Database access: engine per URL and the connectivity probe used by /health."""

from dataclasses import dataclass
from time import perf_counter

from sqlalchemy import Engine, create_engine, select, text
from sqlalchemy.exc import SQLAlchemyError

from app.models import SourceSwitch

_engines: dict[str, Engine] = {}


def get_engine(url: str) -> Engine:
    engine = _engines.get(url)
    if engine is None:
        engine = create_engine(
            url,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 5},
        )
        _engines[url] = engine
    return engine


@dataclass(frozen=True)
class DbProbe:
    ok: bool
    latency_ms: int | None
    disabled_sources: frozenset[str]


def probe_database(url: str) -> DbProbe:
    """Run SELECT 1 and read the disabled-source switches.

    Any failure (no URL, unreachable server, missing schema) reports the database as down. The
    disabled-source set is empty when the database is down, because it cannot be read.
    """
    if not url:
        return DbProbe(ok=False, latency_ms=None, disabled_sources=frozenset())
    started = perf_counter()
    try:
        with get_engine(url).connect() as connection:
            connection.execute(text("SELECT 1"))
            rows = connection.execute(
                select(SourceSwitch.source).where(SourceSwitch.disabled.is_(True))
            ).scalars()
            disabled = frozenset(rows)
    except SQLAlchemyError:
        return DbProbe(ok=False, latency_ms=None, disabled_sources=frozenset())
    latency_ms = round((perf_counter() - started) * 1000)
    return DbProbe(ok=True, latency_ms=latency_ms, disabled_sources=disabled)
