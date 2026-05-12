"""FastAPI application entry point.

The app instance is module-level so uvicorn can load it as `app.main:app`
and pytest's TestClient can import it directly. Routers from `app.routers`
will be wired here in `backend-3`; today this file only exposes the
liveness endpoint.
"""

from fastapi import FastAPI

# Title and version surface in the auto-generated OpenAPI docs at /docs.
# Keeping the version at 0.1.0 until the API stabilises in backend-3.
app = FastAPI(
    title="HMCTS Caseworker Tasks API",
    version="0.1.0",
    description="Backend service for managing caseworker tasks.",
)


@app.get("/healthz", tags=["health"], summary="Liveness check")
def healthz() -> dict[str, str]:
    """Return a 200 with a tiny JSON body.

    Used by the docker-compose healthcheck and by CI smoke tests. The body
    shape is locked by `tests/test_healthz.py`; do not extend it without
    updating that test first.
    """
    return {"status": "ok"}
