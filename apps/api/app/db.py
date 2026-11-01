"""asyncpg connection pool with jsonb and pgvector codecs.

Runtime queries are plain SQL (ruling B-20); Alembic owns the schema. The pool opens lazily and
tolerates a database that is down at start-up, so /health can report it instead of crashing.
"""

import json
import logging
from typing import Any

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


def _dsn() -> str:
    # Accept SQLAlchemy-style URLs too (postgresql+psycopg://...).
    url = get_settings().database_url
    return url.replace("postgresql+psycopg://", "postgresql://").replace(
        "postgresql+asyncpg://", "postgresql://"
    )


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
