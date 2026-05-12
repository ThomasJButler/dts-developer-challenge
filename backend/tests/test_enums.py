"""Tests for the shared TaskStatus enum.

TaskStatus is imported by both the SQLAlchemy model and the Pydantic
schemas, so its contract (string values + str subclass for JSON
serialisation) is locked here.
"""

from app.enums import TaskStatus


def test_task_status_has_three_members():
    # The brief defines exactly three statuses; widening this is a
    # contract change that must update docs/api.md and data-model.md.
    assert set(TaskStatus) == {TaskStatus.todo, TaskStatus.in_progress, TaskStatus.done}


def test_task_status_values_are_lowercase_snake():
    # JSON wire format. The frontend's API client matches on these
    # exact strings; do not rename without coordinating with frontend-2.
    assert TaskStatus.todo.value == "todo"
    assert TaskStatus.in_progress.value == "in_progress"
    assert TaskStatus.done.value == "done"


def test_task_status_is_str_subclass():
    # Inheriting from str means JSON serialisation produces "todo"
    # directly, with no .value lookups, and string comparison works.
    assert TaskStatus.todo == "todo"
    assert isinstance(TaskStatus.todo, str)
