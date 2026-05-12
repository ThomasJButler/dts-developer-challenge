"""Tests for the Pydantic schemas at the API edge.

These tests don't touch the database. They lock in the validation
rules that `TaskCreate`, `TaskUpdateStatus`, and `TaskRead` enforce,
which are the same rules `docs/api.md` documents. Drift between this
file and that document is a bug.
"""

from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from app.enums import TaskStatus
from app.schemas.task import TaskCreate, TaskRead, TaskUpdateStatus


class TestTaskCreate:
    def test_requires_title(self):
        # Missing title → 422 from the API; we surface that as a
        # ValidationError here. An explicit empty string should fail too.
        with pytest.raises(ValidationError):
            TaskCreate(title="")
        with pytest.raises(ValidationError):
            TaskCreate()  # type: ignore[call-arg]

    def test_accepts_title_at_255_chars(self):
        task = TaskCreate(title="x" * 255)
        assert len(task.title) == 255

    def test_rejects_title_over_255_chars(self):
        with pytest.raises(ValidationError):
            TaskCreate(title="x" * 256)

    def test_rejects_unknown_status(self):
        with pytest.raises(ValidationError):
            TaskCreate(title="ok", status="banana")  # type: ignore[arg-type]

    def test_defaults_status_to_todo(self):
        # The brief and docs/api.md both specify todo as the default.
        task = TaskCreate(title="ok")
        assert task.status == TaskStatus.todo

    def test_rejects_naive_due_at(self):
        # Naive datetimes are a common source of "looks-right-locally,
        # breaks-in-prod" bugs. Reject them at the API edge.
        with pytest.raises(ValidationError):
            TaskCreate(title="ok", due_at=datetime(2026, 5, 20, 9, 0))

    def test_accepts_utc_due_at(self):
        when = datetime(2026, 5, 20, 9, 0, tzinfo=UTC)
        task = TaskCreate(title="ok", due_at=when)
        assert task.due_at == when

    def test_accepts_null_description(self):
        # description is optional per docs/api.md; None and absent both ok.
        assert TaskCreate(title="ok", description=None).description is None
        assert TaskCreate(title="ok").description is None


class TestTaskUpdateStatus:
    def test_requires_status(self):
        with pytest.raises(ValidationError):
            TaskUpdateStatus()  # type: ignore[call-arg]

    def test_rejects_unknown_status(self):
        with pytest.raises(ValidationError):
            TaskUpdateStatus(status="banana")  # type: ignore[arg-type]

    def test_accepts_each_valid_status(self):
        for status in TaskStatus:
            assert TaskUpdateStatus(status=status).status == status


class TestTaskRead:
    def test_constructs_from_orm_like_object(self):
        # TaskRead is built from the ORM model by the service layer.
        # A SimpleNamespace mimics the attribute interface here so we
        # don't need a DB session for this test.
        from types import SimpleNamespace
        from uuid import uuid4

        task_id = uuid4()
        now = datetime(2026, 5, 12, 14, 30, tzinfo=UTC)
        ns = SimpleNamespace(
            id=task_id,
            title="Triage case CR-2026-0142",
            description=None,
            status=TaskStatus.todo,
            due_at=None,
            created_at=now,
            updated_at=now,
        )
        read = TaskRead.model_validate(ns)

        assert read.id == task_id
        assert read.title == "Triage case CR-2026-0142"
        assert read.status == TaskStatus.todo
        assert read.created_at == now
        assert read.updated_at == now
