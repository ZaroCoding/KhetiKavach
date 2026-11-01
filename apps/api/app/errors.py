"""The error envelope used by every non-2xx JSON response (CONTRACTS.md "Error envelope")."""

from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.db import DatabaseUnavailable

CODES = {
    401: "UNAUTHORIZED",
    404: "NOT_FOUND",
    422: "VALIDATION_ERROR",
    503: "UPSTREAM_UNAVAILABLE",
    500: "INTERNAL_ERROR",
}


class ApiError(Exception):
    """Raise from any route to return the envelope with a specific status and reason."""

    def __init__(self, status: int, message: str, details: Any = None, code: str | None = None):
        super().__init__(message)
        self.status = status
        self.message = message
        self.details = details
        self.code = code or CODES.get(status, "ERROR")


def validation_error(field: str, reason: str) -> ApiError:
    return ApiError(422, reason, [{"field": field, "reason": reason}])


def envelope(status: int, code: str, message: str, details: Any = None) -> JSONResponse:
    body = {"error": {"code": code, "message": message, "details": details}}
    return JSONResponse(status_code=status, content=body)


def install(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def _api_error(_: Request, exc: ApiError) -> JSONResponse:
        return envelope(exc.status, exc.code, exc.message, exc.details)

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
