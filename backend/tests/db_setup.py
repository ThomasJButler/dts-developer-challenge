"""Test-database bootstrap helpers.

The suite runs against a separate Postgres database (default `tasks_test`)
so it can't see or trample the dev `tasks` data. These two helpers run
once per session from `conftest.py`:

- `ensure_test_database_exists`: creates the test DB if it isn't already
  there, by connecting to the Postgres `postgres` maintenance database.
- `migrate_test_database`: runs Alembic against the test DB so the schema
  matches what the app expects.

Why the awkward maintenance-DB connection: `CREATE DATABASE` cannot run
inside a transaction in Postgres, and SQLAlchemy's default connection
behaviour wraps work in implicit transactions. We use psycopg directly
in AUTOCOMMIT mode against the `postgres` database, which is the only
DB guaranteed to exist on every cluster.
"""

from pathlib import Path
from urllib.parse import urlparse, urlunparse

import psycopg
from alembic import command
from alembic.config import Config

# Resolve once: backend/ is two parents up from this file.
_BACKEND_ROOT = Path(__file__).resolve().parent.parent


def _maintenance_url(database_url: str) -> tuple[str, str]:
    """Split a SQLAlchemy URL into (maintenance_dsn, target_db_name).

    `maintenance_dsn` points at the `postgres` database with a plain psycopg
    scheme (no SQLAlchemy `+psycopg`). `target_db_name` is the database we
    want to ensure exists.
    """
    parsed = urlparse(database_url)
    target_db = parsed.path.lstrip("/")
    if not target_db:
        raise ValueError(f"URL has no database segment: {database_url}")

    # Strip the SQLAlchemy driver suffix ("postgresql+psycopg" → "postgresql")
    # so psycopg.connect accepts the scheme.
    scheme = parsed.scheme.split("+", 1)[0]
    maintenance = parsed._replace(scheme=scheme, path="/postgres")
    return urlunparse(maintenance), target_db


def ensure_test_database_exists(database_url: str) -> None:
    """Create the target database if it doesn't already exist.

    Idempotent. Safe to call on every test-session start.
    """
    maintenance_dsn, target_db = _maintenance_url(database_url)
    # AUTOCOMMIT so CREATE DATABASE isn't wrapped in a transaction.
    with psycopg.connect(maintenance_dsn, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM pg_database WHERE datname = %s",
                (target_db,),
            )
            if cur.fetchone() is None:
                # Identifier quoting is intentional — psycopg's parameter
                # binding doesn't apply to DDL identifiers, so we sanitise
                # by reconstructing the name from `target_db` (which we
                # parsed ourselves, not user-provided input).
                cur.execute(f'CREATE DATABASE "{target_db}"')


def migrate_test_database(database_url: str) -> None:
    """Run Alembic migrations against the given URL.

    Uses the same alembic.ini the runtime uses, but overrides the URL via
    `set_main_option` so we don't depend on `app.config.Settings` here
    (it points at the dev DB).
    """
    cfg = Config(str(_BACKEND_ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(_BACKEND_ROOT / "migrations"))
    cfg.set_main_option("sqlalchemy.url", database_url)
    command.upgrade(cfg, "head")
