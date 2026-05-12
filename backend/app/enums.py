"""Shared domain enums.

Defined here (not inside `app/schemas/task.py` or `app/db/models.py`) so
the schema layer and the persistence layer can both import without
creating a cycle. Both layers go *down* to this module; neither imports
the other.
"""

from enum import Enum


class TaskStatus(str, Enum):
    """The three statuses a task can be in.

    Subclassing `str` is deliberate: it means a `TaskStatus` value
    serialises as the bare string ("todo", "in_progress", "done") in
    JSON without a `.value` lookup, and equality comparisons against
    raw strings just work. The frontend's API client matches on these
    exact strings; the SQLAlchemy column maps to a Postgres ENUM type
    with the same labels (see `app/db/models.py`).
    """

    todo = "todo"
    in_progress = "in_progress"
    done = "done"
