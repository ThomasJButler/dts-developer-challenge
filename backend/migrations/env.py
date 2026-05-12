"""Alembic environment.

This file is invoked by `alembic upgrade`, `alembic revision`, etc.

Two deliberate departures from the stock Alembic template:

1. The database URL is read from `app.config.Settings()` rather than
   `alembic.ini`. That keeps a single source of truth for the connection
   string — operators set `DATABASE_URL` once and both the running app
   and Alembic pick it up.
2. `target_metadata` is bound to `app.db.base.Base.metadata` lazily.
   `backend-2` introduces the first model; until then this is `None`,
   and `--autogenerate` won't find anything to generate, which is the
   correct behaviour.
"""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.config import get_settings

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Inject the URL from our Settings so the .ini doesn't carry secrets
# and so both runtime + migrations share one config source.
config.set_main_option("sqlalchemy.url", get_settings().database_url)

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# `target_metadata` is the schema model that --autogenerate compares
# against the live DB. Currently None because no models exist yet;
# backend-2 swaps this for `Base.metadata` once a Task model lands.
target_metadata = None


def run_migrations_offline() -> None:
    """Render SQL without connecting to a database.

    Used by `alembic upgrade --sql` to produce a script for ops to run
    manually. Not the path we use day-to-day, but cheap to keep working.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against a live database connection."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        # NullPool: migrations are short-lived, no need for a real pool.
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
