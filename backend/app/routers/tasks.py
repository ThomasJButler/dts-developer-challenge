"""Task resource HTTP routes.

Each handler is a one-liner over the service layer. No try/except blocks
here — domain exceptions are turned into HTTP responses by the handlers
in `app.errors`. That keeps the router shape readable: one route =
one call.

`task_id` is declared as `str` everywhere so we can produce a 400 (not
a FastAPI-default 422) for malformed UUIDs, matching `docs/api.md`.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.exceptions import InvalidUUID
from app.schemas.task import TaskCreate, TaskRead, TaskUpdateStatus
from app.services import task as task_service

router = APIRouter(prefix="/tasks", tags=["tasks"])

# Alias the dependency once so each route signature reads cleanly.
# Annotated[..., Depends(...)] is the FastAPI-recommended form and
# avoids ruff's B008 warning about callables in argument defaults.
SessionDep = Annotated[Session, Depends(get_session)]


def _parse_uuid(raw: str) -> UUID:
    """Parse a path-param UUID or raise InvalidUUID for the 400 handler."""
    try:
        return UUID(raw)
    except (ValueError, AttributeError) as exc:
        raise InvalidUUID(raw) from exc


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=TaskRead,
    summary="Create a task",
)
def create_task(data: TaskCreate, session: SessionDep) -> TaskRead:
    """Persist a new task and return its full representation."""
    return task_service.create_task(session, data)  # type: ignore[return-value]


@router.get(
    "/{task_id}",
    response_model=TaskRead,
    summary="Read a single task",
)
def read_task(task_id: str, session: SessionDep) -> TaskRead:
    """Return the task identified by the UUID path parameter."""
    return task_service.get_task(session, _parse_uuid(task_id))  # type: ignore[return-value]


@router.get(
    "",
    response_model=list[TaskRead],
    summary="List every task",
)
def list_tasks(session: SessionDep) -> list[TaskRead]:
    """Return all tasks. No pagination per the brief."""
    return task_service.list_tasks(session)  # type: ignore[return-value]


@router.patch(
    "/{task_id}/status",
    response_model=TaskRead,
    summary="Update a task's status",
)
def update_status(
    task_id: str,
    data: TaskUpdateStatus,
    session: SessionDep,
) -> TaskRead:
    """Change only the status of an existing task."""
    return task_service.update_status(  # type: ignore[return-value]
        session, _parse_uuid(task_id), data.status
    )


@router.delete(
    "/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a task",
)
def delete_task(task_id: str, session: SessionDep) -> None:
    """Hard-delete the task. Returns 204 No Content."""
    task_service.delete_task(session, _parse_uuid(task_id))
