"""Unit tests for the task repository.

Repositories are intentionally thin: they call SQLAlchemy and never
commit. These tests assert that contract directly so any future change
to the repo layer (e.g. adding ordering or filters) doesn't accidentally
leak a commit or hide a query.

The SAVEPOINT fixture rolls everything back, so we can safely flush
rows without polluting the database.
"""

from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import select

from app.db import repositories
from app.db.models import Task
from app.enums import TaskStatus


def test_save_assigns_id_and_timestamps_after_flush(db_session):
    """`save` flushes, so server defaults are visible on the returned Task."""
    task = Task(title="repo save", status=TaskStatus.todo)

    saved = repositories.task.save(db_session, task)

    assert saved.id is not None
    assert saved.created_at is not None
    assert saved.updated_at is not None


def test_save_does_not_commit(db_session):
    """`save` flushes but doesn't commit; rollback still removes the row."""
    task = Task(title="not committed", status=TaskStatus.todo)
    repositories.task.save(db_session, task)
    saved_id = task.id

    # Roll back the SAVEPOINT that the fixture opened. The row created
    # inside this SAVEPOINT must disappear.
    db_session.rollback()

    fetched = db_session.scalar(select(Task).where(Task.id == saved_id))
    assert fetched is None


def test_get_by_id_returns_task_when_present(db_session):
    """`get_by_id` returns the matching Task."""
    task = repositories.task.save(db_session, Task(title="x", status=TaskStatus.todo))

    fetched = repositories.task.get_by_id(db_session, task.id)

    assert fetched is not None
    assert fetched.id == task.id


def test_get_by_id_returns_none_for_unknown_id(db_session):
    """`get_by_id` returns None when no row matches; no exception raised."""
    assert repositories.task.get_by_id(db_session, uuid4()) is None


def test_list_all_returns_every_row(db_session):
    """`list_all` returns every persisted Task with no filtering applied."""
    titles = {"a", "b", "c"}
    for title in titles:
        repositories.task.save(db_session, Task(title=title, status=TaskStatus.todo))

    rows = repositories.task.list_all(db_session)

    assert {row.title for row in rows} == titles


def test_list_all_returns_empty_list_when_no_rows(db_session):
    """An empty table returns an empty list, not None."""
    assert repositories.task.list_all(db_session) == []


def test_delete_marks_for_removal(db_session):
    """`delete` schedules the row for deletion; flushing makes it gone."""
    task = repositories.task.save(db_session, Task(title="bye", status=TaskStatus.todo))

    repositories.task.delete(db_session, task)
    # Flush so the DELETE statement actually fires; rollback at teardown
    # still discards everything.
    db_session.flush()

    fetched = repositories.task.get_by_id(db_session, task.id)
    assert fetched is None


def test_save_preserves_due_at_as_utc(db_session):
    """Aware datetimes are preserved exactly through a flush + refresh."""
    when = datetime(2026, 5, 20, 9, 0, tzinfo=UTC)
    saved = repositories.task.save(
        db_session,
        Task(title="due", status=TaskStatus.todo, due_at=when),
    )

    db_session.refresh(saved)
    assert saved.due_at == when
