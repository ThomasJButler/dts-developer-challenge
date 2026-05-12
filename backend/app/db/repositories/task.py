"""Persistence functions for the Task resource.

These functions know about SQLAlchemy and nothing else — no Pydantic,
no FastAPI, no HTTP. They mutate the session but never commit:
unit-of-work boundaries live one layer up in `app.services.task`.
"""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Task


def save(session: Session, task: Task) -> Task:
    """Add the task to the session and flush so server defaults populate."""
    session.add(task)
    # flush, not commit: the service decides when the unit of work ends.
    # flush makes server_default columns (created_at, updated_at) visible
    # on the ORM object so the caller can serialise them straight away.
    session.flush()
    return task


def get_by_id(session: Session, task_id: UUID) -> Task | None:
    """Return the task with that id, or None if it doesn't exist."""
    return session.scalar(select(Task).where(Task.id == task_id))


def list_all(session: Session) -> list[Task]:
    """Return every task. No pagination per the brief."""
    return list(session.scalars(select(Task)).all())


def delete(session: Session, task: Task) -> None:
    """Mark the task for deletion. The service commits."""
    session.delete(task)
