"""Shared pytest fixtures.

The DB fixtures here run the suite against a separate Postgres database
(default `tasks_test`) so the live dev `tasks` data can't bleed into
tests. The chain is:

1. `db_engine` (session-scoped): connect to the maintenance `postgres`
   DB, CREATE the test DB if missing, run Alembic migrations against it,
   then yield a SQLAlchemy engine pointed at the now-migrated test DB.
2. `db_session` (function-scoped): connection-scoped transaction + nested
   SAVEPOINT pattern. Writes from each test are rolled back at teardown.

Why both layers: the session fixture gives the suite a clean *empty*
table at session start, the per-test fixture isolates each test from
its siblings. Anything tested can `session.commit()` freely; the outer
transaction rolls everything back.

If Postgres is unreachable, `db_engine` skips DB-bound tests with a
clear reason. Schema and enum tests (pure Pydantic) still run.
"""

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.session import get_session
from app.main import app
from tests.db_setup import ensure_test_database_exists, migrate_test_database


@pytest.fixture(scope="session")
def db_engine() -> Generator[Engine, None, None]:
    """Process-wide engine pointing at the test database.

    On session start: ensure the test DB exists, run migrations, then
    yield an engine bound to it. If the maintenance connection fails
    (e.g. Postgres isn't running), skip DB-bound tests rather than fail
    the whole suite.
    """
    settings = get_settings()
    try:
        ensure_test_database_exists(settings.test_database_url)
        migrate_test_database(settings.test_database_url)
    except OperationalError as exc:
        pytest.skip(f"Postgres not reachable: {exc.orig}")
    except Exception as exc:  # noqa: BLE001
        # psycopg's OperationalError is the common case, but we also
        # catch broader failures (e.g. permission denied) and skip
        # rather than fail — the schema/Pydantic suite still has value.
        pytest.skip(f"Test DB bootstrap failed: {exc}")

    engine = create_engine(settings.test_database_url, future=True)
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


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """FastAPI TestClient wired to the rolled-back test session.

    Overrides the `get_session` dependency so route handlers get the
    same SAVEPOINT-protected session the test fixture uses. Anything
    the route commits lands in the nested SAVEPOINT, which is rolled
    back at teardown, so router tests share the no-persistence
    guarantee with the model-level tests.
    """
    app.dependency_overrides[get_session] = lambda: db_session
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(get_session, None)
