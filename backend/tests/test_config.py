"""Tests for the Settings loader.

We don't try to test pydantic-settings itself — only that our Settings
class wires up the expected env var name and applies it.
"""

from app.config import Settings


def test_database_url_read_from_env(monkeypatch):
    """`Settings` reads `DATABASE_URL` from the process environment."""
    # `pydantic-settings` reads env vars case-insensitively; we use the
    # uppercase form here because that's how operators will set it.
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgresql+psycopg://tester:tester@db:5432/test_tasks",
    )
    # Construct a fresh Settings — bypass the lru_cache by not calling
    # get_settings() — so this test doesn't leak state to other tests.
    settings = Settings()

    assert settings.database_url == ("postgresql+psycopg://tester:tester@db:5432/test_tasks")


def test_database_url_has_safe_default(monkeypatch):
    """When `DATABASE_URL` is unset, `Settings` still produces a usable URL."""
    # Belt-and-braces: when DATABASE_URL is absent, we still get a usable
    # URL pointing at the compose Postgres. Stops the app from crashing
    # at import time during local exploration.
    monkeypatch.delenv("DATABASE_URL", raising=False)
    settings = Settings(_env_file=None)

    assert settings.database_url.startswith("postgresql+psycopg://")
