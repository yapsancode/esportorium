"""Approval-flow tests (DEEPENING.md Item 5): submit -> unapproved -> hidden from
the public API -> admin approves (public) or rejects (deleted).

Turnstile is monkeypatched to always pass — this is a bot-check on the submit
endpoint, not something these tests are exercising, and depending on the real
Cloudflare siteverify call (or on whichever TURNSTILE_SECRET_KEY happens to be
configured locally) would make these tests flaky/environment-dependent.

Admin credentials are monkeypatched to a known test username/password rather
than relying on ADMIN_USERNAME/ADMIN_PASSWORD_HASH being set (they aren't, in
CI) or reusing real local credentials (whose plaintext password isn't
available to write a test with).
"""
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from app.main import app  # imports app.database first, which calls load_dotenv()
from app.auth import hash_password
from app.routers import tournaments as tournaments_router

client = TestClient(app)

TEST_ADMIN_USER = "test-admin"
TEST_ADMIN_PASS = "test-admin-password"


@pytest.fixture(autouse=True)
def _bypass_turnstile(monkeypatch):
    async def _always_pass(token: str) -> bool:
        return True
    monkeypatch.setattr(tournaments_router, "verify_turnstile", _always_pass)


@pytest.fixture
def admin_token(monkeypatch) -> str:
    monkeypatch.setenv("ADMIN_USERNAME", TEST_ADMIN_USER)
    monkeypatch.setenv("ADMIN_PASSWORD_HASH", hash_password(TEST_ADMIN_PASS))
    resp = client.post(
        "/api/admin/auth/login",
        json={"username": TEST_ADMIN_USER, "password": TEST_ADMIN_PASS},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _admin_auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _valid_submit_payload(**overrides) -> dict:
    today = date.today()
    payload = {
        "title": "Approval Flow Test Cup",
        "format": "online",
        "start_date": str(today + timedelta(days=10)),
        "end_date": str(today + timedelta(days=11)),
        "registration_deadline": str(today + timedelta(days=9)),
        "prize_pool_rm": 1000,
        "max_teams": 8,
        "organiser_name": "Test Organiser",
        "organiser_contact": "+60123456789",
        "organiser_email": "approval-flow-test@example.com",
        "registration_link": "https://example.com/register",
        "turnstile_token": "test-token",
    }
    payload.update(overrides)
    return payload


def _submit(**overrides) -> dict:
    resp = client.post("/api/tournaments/submit", json=_valid_submit_payload(**overrides))
    assert resp.status_code == 201, resp.text
    return resp.json()


@pytest.fixture
def cleanup_tournaments():
    """Delete every tournament created by this module's tests, admin-side."""
    created_ids: list[str] = []
    yield created_ids
    if not created_ids:
        return
    from app.database import SessionLocal
    from app.models.tournament import Tournament
    db = SessionLocal()
    try:
        db.query(Tournament).filter(Tournament.id.in_(created_ids)).delete(
            synchronize_session=False
        )
        db.commit()
    finally:
        db.close()


def test_submit_creates_unapproved_record(cleanup_tournaments):
    created = _submit()
    cleanup_tournaments.append(created["id"])
    assert created["is_approved"] is False


def test_public_list_excludes_unapproved(cleanup_tournaments):
    created = _submit()
    cleanup_tournaments.append(created["id"])

    resp = client.get("/api/tournaments")
    assert resp.status_code == 200
    assert all(t["id"] != created["id"] for t in resp.json())


def test_public_detail_404_for_unapproved(cleanup_tournaments):
    created = _submit()
    cleanup_tournaments.append(created["id"])

    resp = client.get(f"/api/tournaments/{created['id']}")
    assert resp.status_code == 404


def test_admin_sees_pending_submission(admin_token, cleanup_tournaments):
    created = _submit()
    cleanup_tournaments.append(created["id"])

    resp = client.get("/api/admin/submissions", headers=_admin_auth(admin_token))
    assert resp.status_code == 200
    assert any(t["id"] == created["id"] for t in resp.json())


def test_approve_flips_flag_and_exposes_publicly(admin_token, cleanup_tournaments):
    created = _submit()
    cleanup_tournaments.append(created["id"])

    approve_resp = client.patch(
        f"/api/admin/tournaments/{created['id']}/approve", headers=_admin_auth(admin_token)
    )
    assert approve_resp.status_code == 200
    assert approve_resp.json()["is_approved"] is True

    detail_resp = client.get(f"/api/tournaments/{created['id']}")
    assert detail_resp.status_code == 200

    list_resp = client.get("/api/tournaments")
    assert any(t["id"] == created["id"] for t in list_resp.json())

    submissions_resp = client.get("/api/admin/submissions", headers=_admin_auth(admin_token))
    assert all(t["id"] != created["id"] for t in submissions_resp.json())


def test_reject_deletes_submission(admin_token):
    created = _submit()  # not added to cleanup_tournaments — reject deletes it

    reject_resp = client.patch(
        f"/api/admin/tournaments/{created['id']}/reject", headers=_admin_auth(admin_token)
    )
    assert reject_resp.status_code == 200

    admin_list_resp = client.get("/api/admin/tournaments", headers=_admin_auth(admin_token))
    assert all(t["id"] != created["id"] for t in admin_list_resp.json())

    public_resp = client.get(f"/api/tournaments/{created['id']}")
    assert public_resp.status_code == 404
