"""asyncpg connection pool with jsonb and pgvector codecs.

Runtime queries are plain SQL (ruling B-20); Alembic owns the schema. The pool opens lazily and
tolerates a database that is down at start-up, so /health can report it instead of crashing.
"""

import json
import logging
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import asyncpg
from pgvector.asyncpg import register_vector

from app.config import get_settings

log = logging.getLogger("db")
_pool: Any = None


class DatabaseUnavailable(RuntimeError):
    pass


async def _init_conn(conn: Any) -> None:
    await conn.set_type_codec("jsonb", encoder=json.dumps, decoder=json.loads, schema="pg_catalog")
    await conn.set_type_codec("json", encoder=json.dumps, decoder=json.loads, schema="pg_catalog")
    await register_vector(conn)


def dsn_for_asyncpg(url: str) -> str:
    """Make a database URL acceptable to asyncpg.

    SQLAlchemy-style schemes (postgresql+psycopg://) are normalised, and `channel_binding` is
    dropped: Neon's copy-paste connection string carries `channel_binding=require`, which libpq (so
    Alembic) understands but asyncpg rejects as an unknown parameter. Other parameters such as
    `sslmode` are kept.
    """
    url = url.replace("postgresql+psycopg://", "postgresql://").replace(
        "postgresql+asyncpg://", "postgresql://"
    )
    parts = urlsplit(url)
    kept = [
        (k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True) if k != "channel_binding"
    ]
    return urlunsplit(parts._replace(query=urlencode(kept)))


def _dsn() -> str:
    return dsn_for_asyncpg(get_settings().database_url)


async def init_pool() -> None:
    global _pool
    if _pool is not None:
        return
    try:
        _pool = await asyncpg.create_pool(
            _dsn(), min_size=1, max_size=10, init=_init_conn, command_timeout=30, timeout=5
        )
    except Exception as exc:  # database down: keep serving /health
        log.warning("database unavailable at start-up: %s", exc)
        _pool = None


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def pool() -> Any:
    if _pool is None:
        raise DatabaseUnavailable("database is not connected")
    return _pool


def is_connected() -> bool:
    return _pool is not None
