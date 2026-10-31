"""Error envelope and exception handlers (docs/CONTRACTS.md, error envelope).

Every non-2xx JSON response uses {"error": {"code", "message", "details"}}. FastAPI's default 422
body is replaced; `details` for 422 is a list of {"field", "reason"}.
"""

import logging
from typing import Any, NoReturn

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.schemas.common import ErrorEnvelope

logger = logging.getLogger(__name__)

_STATUS_CODES: dict[int, str] = {
    401: "UNAUTHORIZED",
    404: "NOT_FOUND",
    422: "VALIDATION_ERROR",
    501: "NOT_IMPLEMENTED",
    503: "UPSTREAM_UNAVAILABLE",
}
_LOCATION_PREFIXES = frozenset({"body", "query", "path", "header", "cookie"})


class ApiError(Exception):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: list[dict[str, str]] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details


_RESPONSE_DESCRIPTIONS: dict[int, str] = {
    401: "Missing or wrong credential",
    404: "Unknown resource",
    422: "Validation failed (reason in details)",
    501: "Scaffold: validates input, not implemented yet",
    503: "Required upstream unavailable",
}


def error_responses(*status_codes: int) -> dict[int | str, dict[str, Any]]:
    """OpenAPI `responses` entries that document the error envelope for each status code."""
    return {
        code: {"model": ErrorEnvelope, "description": _RESPONSE_DESCRIPTIONS[code]}
        for code in status_codes
    }


def not_implemented(what: str) -> NoReturn:
    """Scaffolding only: stubs fail loudly with 501 until their implementing prompt lands."""
    raise ApiError(501, "NOT_IMPLEMENTED", f"{what} is not implemented yet")


def _envelope(code: str, message: str, details: object = None) -> dict[str, object]:
    return ErrorEnvelope.model_validate(
        {"error": {"code": code, "message": message, "details": details}}
    ).model_dump(mode="json")


def _field_path(location: tuple[object, ...]) -> str:
    parts = [str(p) for p in location if str(p) not in _LOCATION_PREFIXES]
    return ".".join(parts) or "body"


def _strip_value_error_prefix(message: str) -> str:
    prefix = "Value error, "
    return message[len(prefix) :] if message.startswith(prefix) else message


async def _api_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, ApiError)
    details: object = exc.details
    return JSONResponse(
        status_code=exc.status_code,
        content=_envelope(exc.code, exc.message, details),
    )


async def _validation_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)
    details = [
        {
            "field": _field_path(tuple(err["loc"])),
            "reason": _strip_value_error_prefix(str(err["msg"])),
        }
        for err in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content=_envelope("VALIDATION_ERROR", "request validation failed", details),
    )


async def _http_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, StarletteHTTPException)
    code = _STATUS_CODES.get(exc.status_code, "HTTP_ERROR")
    message = exc.detail if isinstance(exc.detail, str) else "request failed"
    return JSONResponse(
        status_code=exc.status_code,
        content=_envelope(code, message),
        headers=exc.headers,
    )


async def _unhandled_error(_: Request, exc: Exception) -> JSONResponse:
    logger.error("unhandled error", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content=_envelope("INTERNAL_ERROR", "internal server error"),
    )


def install_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(ApiError, _api_error)
    app.add_exception_handler(RequestValidationError, _validation_error)
    app.add_exception_handler(StarletteHTTPException, _http_error)
    app.add_exception_handler(Exception, _unhandled_error)
