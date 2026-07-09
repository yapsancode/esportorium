"""The tenant-isolation proof (DEEPENING.md Item 1, definition of done).

Boots the whole app and drives it over HTTP, so it exercises the real auth
dependencies, the router wiring, and the service enforcement point together.
Like test_health, this needs a Postgres with migrations applied — CI runs
`alembic upgrade head` before pytest.

Two organisers (A and B) are created, B owns a tournament, and A tries every
way to reach it. Every cross-tenant attempt must 404 (not 403 — we don't leak
existence), and A must never be able to forge ownership on create.
"""
import uuid

import pytest
from fastapi.testclient import TestClient

from app.database import SessionLocal
from app.main import app
from app.models.organiser import Organiser
from app.models.tournament import Tournament

client = TestClient(app)


def _signup_and_login(email: str) -> tuple[str, str]:
    """Create an organiser and return (organiser_id, bearer_token)."""
    signup = client.post(
        "/api/organiser/auth/signup",
        json={
            "email": email,
            "password": "hunter2please",
            "display_name": "Org Owner",
            "contact": "+60123456789",
        },
    )
    assert signup.status_code == 201, signup.text
    organiser_id = signup.json()["id"]

    login = client.post(
        "/api/organiser/auth/login",
        json={"email": email, "password": "hunter2please"},
    )
    assert login.status_code == 200, login.text
    return organiser_id, login.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def two_tenants():
    """Organiser A, organiser B, and a tournament owned by B. Cleaned up after."""
    a_id, a_token = _signup_and_login(f"a-{uuid.uuid4().hex}@example.com")
    b_id, b_token = _signup_and_login(f"b-{uuid.uuid4().hex}@example.com")

    created = client.post(
        "/api/organiser/tournaments",
        json={"title": "B's private draft"},
        headers=_auth(b_token),
    )
    assert created.status_code == 201, created.text
    b_tournament_id = created.json()["id"]
    # Ownership is set from B's token, never the (absent) body.
    assert created.json()["organiser_id"] == b_id

    yield {
        "a_id": a_id, "a_token": a_token,
        "b_id": b_id, "b_token": b_token,
        "b_tournament_id": b_tournament_id,
    }

    # Best-effort cleanup so a persistent local dev DB isn't polluted.
    db = SessionLocal()
    try:
        db.query(Tournament).filter(
            Tournament.organiser_id.in_([a_id, b_id])
        ).delete(synchronize_session=False)
        db.query(Organiser).filter(
            Organiser.id.in_([a_id, b_id])
        ).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


def test_organiser_cannot_read_other_tenant(two_tenants):
    t = two_tenants
    r = client.get(
        f"/api/organiser/tournaments/{t['b_tournament_id']}", headers=_auth(t["a_token"])
    )
    assert r.status_code == 404  # not 403 — don't leak existence


def test_organiser_cannot_edit_other_tenant(two_tenants):
    t = two_tenants
    r = client.patch(
        f"/api/organiser/tournaments/{t['b_tournament_id']}",
        json={"title": "hijacked"},
        headers=_auth(t["a_token"]),
    )
    assert r.status_code == 404


def test_organiser_cannot_delete_other_tenant(two_tenants):
    t = two_tenants
    r = client.delete(
        f"/api/organiser/tournaments/{t['b_tournament_id']}", headers=_auth(t["a_token"])
    )
    assert r.status_code == 404
    # And B's row is still there afterwards.
    still_there = client.get(
        f"/api/organiser/tournaments/{t['b_tournament_id']}", headers=_auth(t["b_token"])
    )
    assert still_there.status_code == 200


def test_organiser_cannot_forge_ownership_on_create(two_tenants):
    t = two_tenants
    # A sends B's id in the body; the token must win.
    r = client.post(
        "/api/organiser/tournaments",
        json={"title": "A owns this", "organiser_id": t["b_id"]},
        headers=_auth(t["a_token"]),
    )
    assert r.status_code == 201, r.text
    assert r.json()["organiser_id"] == t["a_id"]  # body ignored, token wins


def test_organiser_list_never_contains_other_tenant(two_tenants):
    t = two_tenants
    r = client.get("/api/organiser/tournaments", headers=_auth(t["a_token"]))
    assert r.status_code == 200
    assert all(row["id"] != t["b_tournament_id"] for row in r.json())


def test_organiser_token_cannot_reach_admin_routes(two_tenants):
    """An organiser JWT must not open the admin panel (role check, not just a valid token)."""
    t = two_tenants
    r = client.get("/api/admin/tournaments", headers=_auth(t["a_token"]))
    assert r.status_code == 403
