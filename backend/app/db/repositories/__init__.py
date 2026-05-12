"""Repository functions: SQLAlchemy queries for each resource.

`task` is the per-resource module; import as `from app.db import repositories`
and call `repositories.task.<fn>` so call-sites read like English.
"""

from app.db.repositories import task

__all__ = ["task"]
