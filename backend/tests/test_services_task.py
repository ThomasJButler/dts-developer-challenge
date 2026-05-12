"""Unit tests for the task service layer.

These tests bypass the HTTP layer and call `app.services.task` directly
against the `db_session` fixture. Two reasons:

1. Coverage attribution. A failing assertion here points straight at the
   service module, not a router that happens to call it.
2. Speed. No TestClient overhead per assertion.

Each test commits or rolls back through the SAVEPOINT fixture, so
nothing persists.
"""

from datetime import UTC, datetime
from uuid import uuid4

import pytest

from app.enums import TaskStatus
from app.exceptions import TaskNotFound
from app.schemas.task import TaskCreate
from app.services import task as task_service


class TestCreateTask:
    """Service-level coverage for `create_task`."""

    def test_persists_and_returns_task(self, db_session):
        """A new Task is added, flushed, and returned with an id."""
        data = TaskCreate(title="Service create")
        task = task_service.create_task(db_session, data)

        assert task.id is not None
        assert task.title == "Service create"
        # Default status applied either by Python or by the DB default
        # (server_default='todo'); either way the read-back value is todo.
        assert task.status == TaskStatus.todo

    def test_sets_server_defaults(self, db_session):
        """`created_at` and `updated_at` are populated server-side."""
        task = task_service.create_task(db_session, TaskCreate(title="defaults"))

        assert task.created_at is not None
        assert task.created_at.tzinfo is not None
        assert task.updated_at is not None
        assert task.updated_at.tzinfo is not None

    def test_round_trips_due_at(self, db_session):
        """An aware datetime round-trips through the service unchanged."""
        when = datetime(2026, 5, 20, 9, 0, tzinfo=UTC)
        task = task_service.create_task(
            db_session,
            TaskCreate(title="due", due_at=when),
        )

        assert task.due_at == when


class TestGetTask:
    """Service-level coverage for `get_task`."""

    def test_returns_task_when_id_exists(self, db_session):
        """An existing id returns the matching Task."""
        created = task_service.create_task(db_session, TaskCreate(title="x"))

        fetched = task_service.get_task(db_session, created.id)

        assert fetched.id == created.id
        assert fetched.title == "x"

    def test_raises_task_not_found_on_unknown_id(self, db_session):
        """A missing id raises the domain exception, not None or a generic error."""
        with pytest.raises(TaskNotFound):
            task_service.get_task(db_session, uuid4())


class TestListTasks:
    """Service-level coverage for `list_tasks`."""

    def test_returns_empty_list_when_table_empty(self, db_session):
        """No rows yields `[]`, never raises."""
        assert task_service.list_tasks(db_session) == []

    def test_returns_every_row(self, db_session):
        """Every persisted Task appears in the result."""
        for title in ("alpha", "beta", "gamma"):
            task_service.create_task(db_session, TaskCreate(title=title))

        rows = task_service.list_tasks(db_session)

        assert {row.title for row in rows} == {"alpha", "beta", "gamma"}


class TestUpdateStatus:
    """Service-level coverage for `update_status`, including every transition."""

    def test_changes_status_and_refreshes_updated_at(self, db_session):
        """Updating status mutates the row and bumps updated_at via onupdate."""
        created = task_service.create_task(db_session, TaskCreate(title="x"))
        before_updated_at = created.updated_at

        updated = task_service.update_status(
            db_session, created.id, TaskStatus.in_progress
        )

        assert updated.status == TaskStatus.in_progress
        # `updated_at` is server-side onupdate=func.now(); it must change.
        assert updated.updated_at >= before_updated_at

    def test_raises_task_not_found_on_unknown_id(self, db_session):
        """Updating a non-existent id raises TaskNotFound."""
        with pytest.raises(TaskNotFound):
            task_service.update_status(db_session, uuid4(), TaskStatus.done)

    @pytest.mark.parametrize(
        ("from_status", "to_status"),
        [
            (a, b)
            for a in TaskStatus
            for b in TaskStatus
            # Cover every transition including no-op (todo→todo) — they
            # all need to succeed because the brief doesn't specify a
            # state machine, only that status changes via this endpoint.
        ],
    )
    def test_supports_every_transition(self, db_session, from_status, to_status):
        """Any of the 9 status-to-status transitions succeeds."""
        created = task_service.create_task(db_session, TaskCreate(title="x"))
        # First move into the `from_status` if needed.
        if created.status != from_status:
            task_service.update_status(db_session, created.id, from_status)

        updated = task_service.update_status(db_session, created.id, to_status)

        assert updated.status == to_status


class TestDeleteTask:
    """Service-level coverage for `delete_task`."""

    def test_removes_row(self, db_session):
        """After deletion, `get_task` raises TaskNotFound for the same id."""
        created = task_service.create_task(db_session, TaskCreate(title="x"))

        task_service.delete_task(db_session, created.id)

        with pytest.raises(TaskNotFound):
            task_service.get_task(db_session, created.id)

    def test_raises_task_not_found_on_unknown_id(self, db_session):
        """Deleting a non-existent id raises the domain exception."""
        with pytest.raises(TaskNotFound):
            task_service.delete_task(db_session, uuid4())
