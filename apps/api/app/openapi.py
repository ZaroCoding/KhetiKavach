"""OpenAPI document for /openapi.json.

FastAPI only publishes schemas reachable from a route's response model. The SSE event union is
referenced by the stream route's `text/event-stream` content, so it is added to the components
here, along with the models it depends on.
"""

from typing import Any

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi
from pydantic import TypeAdapter

from app.schemas.events import SseEvent


def _openapi_document(app: FastAPI) -> dict[str, Any]:
    if app.openapi_schema is not None:
        return app.openapi_schema
    schema = get_openapi(
        title=app.title,
        version=app.version,
        routes=app.routes,
    )
    sse = TypeAdapter(SseEvent).json_schema(ref_template="#/components/schemas/{model}")
    defs = sse.pop("$defs", {})
    components: dict[str, Any] = schema.setdefault("components", {}).setdefault("schemas", {})
    components.update(defs)
    components["SseEvent"] = sse
    app.openapi_schema = schema
    return schema


def install_openapi(app: FastAPI) -> None:
    def openapi() -> dict[str, Any]:
        return _openapi_document(app)

    app.openapi = openapi  # type: ignore[method-assign]
