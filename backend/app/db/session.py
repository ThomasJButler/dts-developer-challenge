"""Database engine and session factory.

The engine is a process-wide singleton: building it is expensive (it
manages a connection pool) so we keep one. The `SessionLocal` factory
hands out a fresh session per call. Each HTTP request gets its own
session — sessions are not thread-safe and carrying state across
requests is a classic bug source.

`get_session` is the FastAPI dependency that routers (added in
`backend-3`) will inject. It yields a session and guarantees it's closed
when the request finishes, even on error.
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings

# Built lazily via get_settings() so tests can override the URL before
# the engine is created. `future=True` is the default on SQLAlchemy 2.x
# but stating it makes the 2.0 style explicit for readers.
_settings = get_settings()
engine = create_engine(
    _settings.database_url,
    future=True,
    # pool_pre_ping survives connections that the DB has closed (e.g.
    # after a compose restart). Cheap and worth it for dev ergonomics.
    pool_pre_ping=True,
)


# `expire_on_commit=False` keeps attribute access working on ORM objects
# after a commit. Without it, FastAPI's response serialisation would
# re-query for every attribute, which is wasteful for our small payloads.
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=Session,
)


def get_session() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a request-scoped Session."""
    session = SessionLocal()
    try:
        yield session
    finally:
        # Always close — releases the connection back to the pool. We do
        # not commit here; commits happen in the service layer where the
        # unit of work is defined.
        session.close()
