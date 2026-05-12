"""FastAPI application entry point.

The app instance is module-level so uvicorn can load it as `app.main:app`
and pytest's TestClient can import it directly. Routers from `app.routers`
will be wired here in `backend-3`; today this file only exposes the
liveness endpoint.
"""

from fastapi import FastAPI

from app.errors import register_exception_handlers
from app.routers import tasks as tasks_router

# Title and version surface in the auto-generated OpenAPI docs at /docs.
app = FastAPI(
    title="HMCTS Caseworker Tasks API",
    version="0.1.0",
    description="Backend service for managing caseworker tasks.",
)

# Wire the resource routers. One include_router call per resource keeps
# the OpenAPI tag grouping clean.
app.include_router(tasks_router.router)

# Register Problem-Details exception handlers (see app/errors.py).
# Routes raise domain exceptions; the handlers turn them into HTTP.
register_exception_handlers(app)


@app.get("/healthz", tags=["health"], summary="Liveness check")
def healthz() -> dict[str, str]:
    """Return a 200 with a tiny JSON body.

    Used by the docker-compose healthcheck and by CI smoke tests. The body
    shape is locked by `tests/test_healthz.py`; do not extend it without
    updating that test first.
    """
    return {"status": "ok"}
