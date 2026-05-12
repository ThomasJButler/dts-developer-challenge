"""Application configuration.

`pydantic-settings` is used instead of reading `os.environ` directly so
each setting gets a declared type, gets validated on startup, and can be
discovered from one place. Anything that needs configuration (DB URL,
log level, feature flags) lands here.

`Settings()` reads from process env first, then from a `.env` file in the
backend working directory if present. The `.env` is gitignored;
`.env.example` at the repo root documents the expected keys.
"""

from functools import lru_cache
from urllib.parse import urlparse, urlunparse

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed application configuration loaded from environment variables.

    Add new fields here as the app grows; each one gets validated on
    startup and is discoverable from a single location.
    """

    # Connection string for SQLAlchemy. The `postgresql+psycopg://` scheme
    # selects the psycopg 3 driver explicitly; without it, SQLAlchemy falls
    # back to psycopg2, which we don't depend on.
    database_url: str = Field(
        default="postgresql+psycopg://postgres:postgres@localhost:5432/tasks",
        description="SQLAlchemy database URL.",
    )

    # URL the test suite uses. Defaults to the dev URL with the database
    # name swapped to `tasks_test`, so a developer who only sets
    # DATABASE_URL still gets a sensible isolated test database without
    # extra config. Operators can override explicitly via TEST_DATABASE_URL.
    test_database_url: str = Field(
        default="",
        description="SQLAlchemy URL for the pytest suite. Derived from database_url if empty.",
    )

    @model_validator(mode="after")
    def _derive_test_database_url(self) -> "Settings":
        """Compute test_database_url from database_url when not explicitly set.

        Swap the final path segment (the database name) for `tasks_test`.
        Avoids running the test suite against the dev `tasks` database,
        which used to leak pre-existing rows into list-endpoint reads.
        """
        if not self.test_database_url:
            parsed = urlparse(self.database_url)
            new_path = "/tasks_test"
            self.test_database_url = urlunparse(parsed._replace(path=new_path))
        return self

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        # Settings names are case-insensitive when read from env, so
        # DATABASE_URL and database_url both work.
        case_sensitive=False,
        # Ignore unrelated env vars rather than failing — useful when the
        # process also has frontend or compose env vars in scope.
        extra="ignore",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached Settings accessor.

    Wrapped in `lru_cache` so the env is parsed once per process. FastAPI
    can inject this via `Depends(get_settings)` in routes that need config,
    and tests can override it via the FastAPI dependency-overrides hook.
    """
    return Settings()
