"""Shared pytest fixtures.

The DB fixtures here use the "connection-scoped transaction + nested
savepoint" pattern. Two reasons:

1. Tests get real Postgres semantics (ENUMs, timestamptz, server-side
   defaults) instead of an in-memory shim that diverges from prod.
2. Nothing persists. The outer transaction never commits, so even an
   assertion failure mid-test leaves the database untouched.

If Docker isn't running, the engine fixture detects the connection
failure and skips DB-bound tests with a clear reason. Schema tests
(pure Pydantic) still run.
"""

from collections.abc import Generator

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.config import get_settings


@pytest.fixture(scope="session")
def db_engine() -> Generator[Engine, None, None]:
    """Process-wide engine pointing at the configured DATABASE_URL.

    If Postgres isn't reachable, skip DB-bound tests rather than fail
    them. Lets developers run the schema tests alone without Docker.
    """
    engine = create_engine(get_settings().database_url, future=True)
    # Probe the connection up-front so we fail fast with a useful reason.
    try:
        with engine.connect():
            pass
    except OperationalError as exc:
        pytest.skip(f"Postgres not reachable: {exc.orig}")
    yield engine
    engine.dispose()


@pytest.fixture()
def db_session(db_engine: Engine) -> Generator[Session, None, None]:
    """Yield a Session whose work is rolled back at teardown.

    The pattern:
    - Open a single connection.
    - Begin an outer transaction (never committed).
    - Begin a nested SAVEPOINT bound to that connection.
    - Bind the Session to the connection so its `commit()` only ends
      the nested SAVEPOINT, leaving the outer transaction open.
    - On `after_transaction_end`, restart a fresh SAVEPOINT so the
      Session can be used across multiple commits inside one test.
    - At teardown, roll back the outer transaction. Postgres discards
      everything.
    """
    connection = db_engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, expire_on_commit=False)
    # First savepoint. SQLAlchemy 2.x calls this "begin_nested" on the
    # connection; the Session participates via the event listener below.
    connection.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def _restart_savepoint(sess: Session, trans) -> None:
        """Reopen a SAVEPOINT after one ends so the test can keep committing."""
        if trans.nested and not trans._parent.nested:  # type: ignore[attr-defined]
            connection.begin_nested()

    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()
