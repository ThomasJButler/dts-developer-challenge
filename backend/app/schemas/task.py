"""Pydantic v2 schemas for the Task resource.

Three schemas, each pinned to a single use:

- `TaskCreate` — request body for POST /tasks.
- `TaskUpdateStatus` — request body for PATCH /tasks/{id}/status.
- `TaskRead` — response body for any endpoint that returns a task.

The shape of each matches `docs/api.md`. Drift between these classes
and that document is a bug — both sides of the contract live by it.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.enums import TaskStatus

# Title length is enforced both here and at the DB level (String(255)).
# Defence in depth: Pydantic gives a clean 422 with a useful message,
# the DB column gives a hard backstop.
_TITLE_MIN = 1
_TITLE_MAX = 255


def _require_aware(value: datetime | None) -> datetime | None:
    """Reject naive datetimes.

    Operators frequently send local-time strings and expect the server
    to "figure it out". That guessing is the bug. We reject any datetime
    without tzinfo so the contract is unambiguous: callers say what they
    mean, we store UTC.
    """
    if value is not None and value.tzinfo is None:
        raise ValueError("datetime must include a timezone offset")
    return value


class TaskCreate(BaseModel):
    """Request body for POST /tasks.

    `status` defaults to `todo` if omitted, matching the brief.
    """

    title: str = Field(min_length=_TITLE_MIN, max_length=_TITLE_MAX)
    description: str | None = None
    status: TaskStatus = TaskStatus.todo
    due_at: datetime | None = None

    @field_validator("due_at")
    @classmethod
    def _due_at_must_be_aware(cls, value: datetime | None) -> datetime | None:
        return _require_aware(value)


class TaskUpdateStatus(BaseModel):
    """Request body for PATCH /tasks/{id}/status.

    Only the status changes. Other fields cannot be updated per the
    brief; if that ever needs to change, add a separate schema rather
    than widening this one.
    """

    status: TaskStatus


class TaskRead(BaseModel):
    """Response body for any endpoint returning a task.

    Built from an ORM `Task` object via `model_validate(task)`. The
    `from_attributes=True` config tells Pydantic to read attributes
    (`task.title`) rather than dictionary keys.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    description: str | None
    status: TaskStatus
    due_at: datetime | None
    created_at: datetime
    updated_at: datetime
