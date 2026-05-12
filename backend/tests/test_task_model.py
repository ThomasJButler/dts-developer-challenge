"""DB round-trip tests for the Task ORM model.

These tests need a real Postgres because the Task model uses a Postgres
ENUM type and `timestamptz` columns; SQLite would lie about both.

The fixture in conftest.py rolls everything back, so these tests are
safe to run against the dev database.
"""

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select

from app.db.models import Task
from app.enums import TaskStatus


def test_task_round_trip(db_session):
    """Create, flush, query back, assert."""
    due = datetime(2026, 5, 20, 9, 0, tzinfo=UTC)
    task = Task(
        title="Triage case CR-2026-0142",
        description="Initial review.",
        status=TaskStatus.in_progress,
        due_at=due,
    )
    db_session.add(task)
    # Flush, don't commit. The savepoint fixture would roll back any
    # commit anyway, but flush is enough to assign server defaults
    # (created_at, updated_at) and surface constraint violations.
    db_session.flush()

    # Round-trip: clear the identity map and re-fetch by id so we test
    # the values actually written to Postgres, not what's still in
    # Python memory.
    saved_id = task.id
    db_session.expire_all()
    fetched = db_session.scalar(select(Task).where(Task.id == saved_id))

    assert fetched is not None
    assert isinstance(fetched.id, UUID)
    assert fetched.title == "Triage case CR-2026-0142"
    assert fetched.description == "Initial review."
    assert fetched.status == TaskStatus.in_progress
    assert fetched.due_at == due
    # created_at / updated_at are populated by Postgres on insert.
    assert fetched.created_at is not None
    assert fetched.created_at.tzinfo is not None
    assert fetched.updated_at is not None
    assert fetched.updated_at.tzinfo is not None


def test_task_status_defaults_to_todo(db_session):
    """Omitting status falls back to the DB-side default."""
    task = Task(title="Default status check")
    db_session.add(task)
    db_session.flush()

    assert task.status == TaskStatus.todo


def test_task_description_is_nullable(db_session):
    """No description is fine; the column allows NULL."""
    task = Task(title="No description")
    db_session.add(task)
    db_session.flush()

    assert task.description is None


def test_task_due_at_is_nullable(db_session):
    """due_at is optional per the brief."""
    task = Task(title="No due date")
    db_session.add(task)
    db_session.flush()

    assert task.due_at is None
