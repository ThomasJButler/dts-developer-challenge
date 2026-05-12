"""Tests for the liveness endpoint.

`/healthz` is used by the Docker healthcheck and CI smoke checks, so its
contract is fixed: 200 OK with body `{"status": "ok"}`. Any drift breaks
both compose and CI, so we pin it here.
"""

from fastapi.testclient import TestClient

from app.main import app


def test_healthz_returns_ok():
    """`/healthz` returns 200 OK with the body `{"status": "ok"}`."""
    # TestClient runs the app in-process via httpx; no live server needed.
    client = TestClient(app)
    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
