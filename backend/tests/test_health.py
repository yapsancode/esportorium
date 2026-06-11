"""Smoke tests that boot the whole FastAPI app.

Importing app.main runs Base.metadata.create_all(), so these require a real
Postgres database (the model uses Postgres-only ARRAY/UUID columns). In CI a
Postgres service container is provided and DATABASE_URL points to it.
"""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_ok():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_list_tournaments_returns_list():
    resp = client.get("/api/tournaments")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_get_unknown_tournament_404():
    resp = client.get("/api/tournaments/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404
