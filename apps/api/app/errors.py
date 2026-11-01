"""The error envelope used by every non-2xx JSON response (CONTRACTS.md "Error envelope")."""

import logging
from typing import Any

import asyncpg
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import get_settings
from app.db import DatabaseUnavailable

log = logging.getLogger("errors")

CODES = {
    401: "UNAUTHORIZED",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    422: "VALIDATION_ERROR",
    429: "RATE_LIMITED",
    503: "UPSTREAM_UNAVAILABLE",
    500: "INTERNAL_ERROR",
}

# A database that cannot be reached mid-request is an upstream outage (503), not a server bug.
DB_UNAVAILABLE = (asyncpg.PostgresConnectionError, asyncpg.InterfaceError, ConnectionError)


class ApiError(Exception):
    """Raise from any route to return the envelope with a specific status and reason."""

    def __init__(
        self,
        status: int,
        message: str,
        details: Any = None,
        code: str | None = None,
        headers: dict[str, str] | None = None,
    ):
        super().__init__(message)
        self.status = status
        self.message = message
        self.details = details
        self.code = code or CODES.get(status, "ERROR")
        self.headers = headers


def validation_error(field: str, reason: str) -> ApiError:
    return ApiError(422, reason, [{"field": field, "reason": reason}])


def envelope(
    status: int, code: str, message: str, details: Any = None, headers: dict[str, str] | None = None
) -> JSONResponse:
    body = {"error": {"code": code, "message": message, "details": details}}
    return JSONResponse(status_code=status, content=body, headers=headers)


def _cors_headers(request: Request) -> dict[str, str]:
    """The catch-all handler runs outside CORSMiddleware. Without these headers a browser reports a
    server error as "Failed to fetch" and the page never sees the envelope."""
    origin = request.headers.get("origin")
    allowed = get_settings().cors_origin_list
    if not origin:
        return {}
    if "*" in allowed:
        return {"access-control-allow-origin": "*"}
    if origin in allowed:
        return {"access-control-allow-origin": origin, "vary": "Origin"}
    return {}


def install(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def _api_error(_: Request, exc: ApiError) -> JSONResponse:
        return envelope(exc.status, exc.code, exc.message, exc.details, exc.headers)

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        details = [
            {"field": ".".join(str(p) for p in e["loc"] if p != "body"), "reason": e["msg"]}
            for e in exc.errors()
        ]
        message = details[0]["reason"] if details else "invalid request"
        return envelope(422, "VALIDATION_ERROR", message, details)

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = CODES.get(exc.status_code, "ERROR")
        return envelope(exc.status_code, code, str(exc.detail), None)

    @app.exception_handler(DatabaseUnavailable)
    async def _db(_: Request, exc: DatabaseUnavailable) -> JSONResponse:
        return envelope(503, "UPSTREAM_UNAVAILABLE", str(exc), None)

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
        headers = _cors_headers(request)
        # Log the type and route only: exception text can carry a URL with a token in it.
        if isinstance(exc, DB_UNAVAILABLE):
            log.warning("database unreachable during %s %s", request.method, request.url.path)
            return envelope(
                503, "UPSTREAM_UNAVAILABLE", "database unavailable; retry shortly", headers=headers
            )
        log.error("unhandled %s during %s %s", type(exc).__name__, request.method, request.url.path)
        return envelope(500, "INTERNAL_ERROR", "internal server error", headers=headers)
