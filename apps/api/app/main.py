"""FastAPI application entry point."""

import json
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app import db, errors
from app.agent.persist import reap_stale_runs
from app.config import get_settings
from app.routers import assessments, districts, fields, health, ops


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        return json.dumps(
            {
                "level": record.levelname,
                "logger": record.name,
                "msg": record.getMessage(),
                "time": self.formatTime(record),
            }
        )


def quiet_http_loggers() -> None:
    """httpx logs each request line, URL included, at INFO; the Telegram bot token is in its URL."""
    for name in ("httpx", "httpcore"):
        logging.getLogger(name).setLevel(logging.WARNING)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    logging.basicConfig(level=get_settings().log_level, handlers=[handler], force=True)
    quiet_http_loggers()
    await db.init_pool()
    await reap_stale_runs()
    yield
    await db.close_pool()


app = FastAPI(title="KhetKavach API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origin_list,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
errors.install(app)

app.include_router(health.router)
app.include_router(districts.router)
app.include_router(fields.router)
app.include_router(assessments.router)
app.include_router(ops.router)


@app.get("/", include_in_schema=False)
@app.get("/app", include_in_schema=False)
async def root() -> RedirectResponse:
    return RedirectResponse(url="/docs")
