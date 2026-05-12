"""Domain exceptions.

Raised by the service layer to signal a business-rule violation.
Translated to HTTP responses by the exception handlers in `app.errors`.
The router never catches these explicitly — the handler does it
centrally so each route stays a thin shell.
"""

from uuid import UUID


class TaskNotFound(Exception):
    """Raised when a task id refers to a row that does not exist."""

    def __init__(self, task_id: UUID | str) -> None:
        self.task_id = task_id
        super().__init__(f"Task {task_id} not found")


class InvalidUUID(Exception):
    """Raised when a path parameter is not a parseable UUID.

    We catch this manually rather than declaring path params as `UUID`
    because FastAPI's default for an unparseable UUID path is 422,
    while the API contract in `docs/api.md` specifies 400.
    """

    def __init__(self, raw: str) -> None:
        self.raw = raw
        super().__init__(f"Path parameter '{raw}' is not a valid UUID")
