"""Persistence layer.

Re-export the declarative `Base` so other modules (and Alembic) have
one canonical import path.
"""

from app.db.base import Base

__all__ = ["Base"]
