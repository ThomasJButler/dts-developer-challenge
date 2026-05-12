"""HTTP-level tests for the /tasks endpoints.

These tests exercise the full router → service → repository → DB chain
via FastAPI's TestClient. The `client` fixture overrides `get_session`
to inject the SAVEPOINT-protected `db_session`, so anything the route
commits is rolled back at teardown.

Drift between any test here and `docs/api.md` is a bug. The contract
wins; fix the test or the implementation, not the contract document.
"""

from uuid import uuid4


class TestPostTask:
    """Validation and happy-path behaviour for POST /tasks."""

    def test_creates_task_returns_201_with_body(self, client):
        """Happy path: 201 with the full TaskRead body, status defaults to todo."""
        response = client.post(
            "/tasks",
            json={"title": "Triage case CR-2026-0142"},
        )

        assert response.status_code == 201
        body = response.json()
        assert body["title"] == "Triage case CR-2026-0142"
        assert body["status"] == "todo"
        assert body["description"] is None
        assert body["due_at"] is None
        assert body["id"]
        assert body["created_at"]
        assert body["updated_at"]

    def test_accepts_full_body(self, client):
        """All optional fields round-trip when supplied."""
        response = client.post(
            "/tasks",
            json={
                "title": "Review case file",
                "description": "Initial triage.",
                "status": "in_progress",
                "due_at": "2026-05-20T09:00:00Z",
            },
        )

        assert response.status_code == 201
        body = response.json()
        assert body["status"] == "in_progress"
        assert body["description"] == "Initial triage."
        assert body["due_at"].startswith("2026-05-20T09:00:00")

    def test_rejects_missing_title_with_422(self, client):
        """Missing title returns 422 with Problem-Details body."""
        response = client.post("/tasks", json={})

        assert response.status_code == 422
        body = response.json()
        assert body["status"] == 422
        assert body["title"] == "Unprocessable Entity"
        assert any(err["field"] == "title" for err in body["errors"])

    def test_rejects_oversize_title_with_422(self, client):
        """Title over 255 chars returns 422."""
        response = client.post("/tasks", json={"title": "x" * 256})

        assert response.status_code == 422
        assert any(err["field"] == "title" for err in response.json()["errors"])

    def test_rejects_unknown_status_with_422(self, client):
        """Status outside the enum returns 422."""
        response = client.post(
            "/tasks",
            json={"title": "ok", "status": "banana"},
        )

        assert response.status_code == 422
        assert any(err["field"] == "status" for err in response.json()["errors"])

    def test_rejects_naive_due_at_with_422(self, client):
        """Naive datetime (no offset) returns 422."""
        response = client.post(
            "/tasks",
            json={"title": "ok", "due_at": "2026-05-20T09:00:00"},
        )

        assert response.status_code == 422
        assert any(err["field"] == "due_at" for err in response.json()["errors"])


class TestGetTask:
    """GET /tasks/{id} placeholder — fleshed out in cycle 2."""

    def test_unknown_id_returns_404(self, client):
        """A well-formed UUID with no row returns 404."""
        response = client.get(f"/tasks/{uuid4()}")
        assert response.status_code == 404
