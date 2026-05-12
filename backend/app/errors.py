"""HTTP error responses in the Problem-Details shape.

Every error response — validation, not-found, malformed-UUID, server
error — comes through one of these handlers. The shape is documented
in `docs/api.md` and `docs/backend/decisions.md` (ADR-003).

Why centralised: each route is a one-liner that calls the service.
Routes don't try/except; they raise domain exceptions and let the
handlers turn them into HTTP. Keeps the router file readable.
"""

from http import HTTPStatus
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.exceptions import InvalidUUID, TaskNotFound


def _problem(
    status: int,
    detail: str,
    errors: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    """Build a Problem-Details body. `errors` is included only when present."""
    body: dict[str, Any] = {
        "type": "about:blank",
        "title": HTTPStatus(status).phrase,
        "status": status,
        "detail": detail,
    }
    if errors is not None:
        body["errors"] = errors
    return body


def _flatten_validation_errors(exc: RequestValidationError) -> list[dict[str, str]]:
    """Turn FastAPI's pydantic error list into the [{field, message}] shape.

    `loc` from Pydantic looks like ('body', 'title') or ('body', 'due_at').
    We strip the source prefix (body/query/path) and join the rest with
    dots so nested fields stay readable.
    """
    flattened: list[dict[str, str]] = []
    for err in exc.errors():
        loc = err.get("loc", ())
        # Drop the source segment if present; we only care about the field path.
        if loc and loc[0] in {"body", "query", "path", "header", "cookie"}:
            loc = loc[1:]
        field = ".".join(str(part) for part in loc) if loc else "<request>"
        flattened.append({"field": field, "message": err.get("msg", "invalid")})
    return flattened


async def _handle_validation_error(_request: Request, exc: Exception) -> JSONResponse:
    """RequestValidationError → 422 Problem-Details with errors[]."""
    assert isinstance(exc, RequestValidationError)
    errors = _flatten_validation_errors(exc)
    return JSONResponse(
        status_code=422,
        content=_problem(422, "Request body failed validation", errors=errors),
    )


async def _handle_task_not_found(_request: Request, exc: Exception) -> JSONResponse:
    """TaskNotFound → 404 Problem-Details."""
    assert isinstance(exc, TaskNotFound)
    return JSONResponse(status_code=404, content=_problem(404, str(exc)))


async def _handle_invalid_uuid(_request: Request, exc: Exception) -> JSONResponse:
    """InvalidUUID → 400 Problem-Details."""
    assert isinstance(exc, InvalidUUID)
    return JSONResponse(status_code=400, content=_problem(400, str(exc)))


async def _handle_unexpected(_request: Request, _exc: Exception) -> JSONResponse:
    """Catch-all → 500 with a fixed message. Internals must not leak.

    The real exception is logged by FastAPI's default logging; here we
    only produce a body the client can read. The body never includes
    stack frames or exception messages.
    """
    return JSONResponse(
        status_code=500,
        content=_problem(500, "An unexpected error occurred"),
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Wire every domain exception (plus the catch-all) into FastAPI."""
    app.add_exception_handler(RequestValidationError, _handle_validation_error)
    app.add_exception_handler(TaskNotFound, _handle_task_not_found)
    app.add_exception_handler(InvalidUUID, _handle_invalid_uuid)
    # `Exception` last so more specific handlers win.
    app.add_exception_handler(Exception, _handle_unexpected)
