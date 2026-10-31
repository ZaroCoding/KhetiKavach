"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.errors import install_error_handlers
from app.openapi import install_openapi
from app.routers import (
    admin,
    assessments,
    districts,
    fields,
    geocode,
    health,
    jobs,
    sensors,
    telegram,
)

app = FastAPI(title="KhetKavach API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origin_list,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

install_error_handlers(app)
install_openapi(app)

app.include_router(health.router)
app.include_router(districts.router)
app.include_router(geocode.router)
app.include_router(fields.router)
app.include_router(assessments.router)
app.include_router(sensors.router)
app.include_router(telegram.router)
app.include_router(jobs.router)
app.include_router(admin.router)
