"""Domain operations on tasks.

Services take a session plus plain Python values, do their work, commit,
and return the ORM Task. They never know about HTTP or Pydantic — the
router unpacks the request schema and passes the fields in.

Each service is the unit-of-work boundary: it owns the `session.commit()`
call. The repository layer never commits.
"""

from uuid import UUID

from sqlalchemy.orm import Session

from app.db import repositories
from app.db.models import Task
from app.enums import TaskStatus
from app.exceptions import TaskNotFound
from app.schemas.task import TaskCreate


def create_task(session: Session, data: TaskCreate) -> Task:
    """Persist a new Task built from the validated create payload."""
    task = Task(
        title=data.title,
        description=data.description,
        status=data.status,
        due_at=data.due_at,
    )
    repositories.task.save(session, task)
    session.commit()
    # Refresh so server-side defaults (created_at, updated_at) are
    # visible after the commit ends the implicit transaction.
    session.refresh(task)
    return task


def get_task(session: Session, task_id: UUID) -> Task:
    """Return the task or raise TaskNotFound."""
    task = repositories.task.get_by_id(session, task_id)
    if task is None:
        raise TaskNotFound(task_id)
    return task


def list_tasks(session: Session) -> list[Task]:
    """Return every task."""
    return repositories.task.list_all(session)


def update_status(session: Session, task_id: UUID, status: TaskStatus) -> Task:
    """Set the status on an existing task and return the updated row."""
    task = get_task(session, task_id)
    task.status = status
    session.commit()
    session.refresh(task)
    return task


def delete_task(session: Session, task_id: UUID) -> None:
    """Remove the task or raise TaskNotFound if it doesn't exist."""
    task = get_task(session, task_id)
    repositories.task.delete(session, task)
    session.commit()
