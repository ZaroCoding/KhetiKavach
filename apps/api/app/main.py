"""FastAPI application entry point."""

import json
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import db, errors
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


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    logging.basicConfig(level=get_settings().log_level, handlers=[handler], force=True)
    await db.init_pool()
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
