"""Claim-flow proof (Phase 0 — "claim your account").

An approved tournament that no account owns (a public submission or an admin
seed) can be bound to an organiser account via a capability token emailed on
approval. Boots the whole app and drives it over HTTP, so it exercises the real
auth dependency, the claim-token type check, and the service enforcement point
together. Like the isolation proof, this needs a Postgres with migrations
applied — CI runs `alembic upgrade head` before pytest.

The invariants under test:
  * a claim binds ownership from the JWT, never the body;
  * an already-owned tournament can't be claimed again (no theft via a leaked
    or reused link) — 409;
  * a login token is not a claim token and vice versa — 400;
  * preview is unauthenticated (holding the token is the capability) and
    reports whether the tournament is already claimed.
"""
import uuid

import pytest
from fastapi.testclient import TestClient

from app.auth import create_claim_token
from app.database import SessionLocal
from app.main import app
from app.models.organiser import Organiser
from app.models.tournament import Tournament

client = TestClient(app)


def _signup_and_login(email: str) -> tuple[str, str]:
    signup = client.post(
        "/api/organiser/auth/signup",
        json={
            "email": email,
            "password": "hunter2please",
            "display_name": "Claimer",
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
def claimable():
    """An ownerless approved tournament + its claim token, and one organiser.

    The tournament is inserted directly (no organiser create path can produce an
    ownerless row) to model a public submission the admin has approved.
    """
    db = SessionLocal()
    t = Tournament(
        title="Ownerless Open 2026",
        format="online",
        is_approved=True,
        organiser_email="owner@example.com",
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    tournament_id = str(t.id)
    db.close()

    claim_token = create_claim_token(tournament_id)
    org_id, org_token = _signup_and_login(f"claimer-{uuid.uuid4().hex}@example.com")

    yield {
        "tournament_id": tournament_id,
        "claim_token": claim_token,
        "org_id": org_id,
        "org_token": org_token,
    }

    db = SessionLocal()
    try:
        db.query(Tournament).filter(Tournament.id == tournament_id).delete(synchronize_session=False)
        db.query(Organiser).filter(Organiser.id == org_id).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


def test_preview_is_unauthenticated_and_reports_state(claimable):
    c = claimable
    r = client.get("/api/organiser/claim/preview", params={"token": c["claim_token"]})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["title"] == "Ownerless Open 2026"
    assert body["already_claimed"] is False


def test_organiser_can_claim_ownerless_tournament(claimable):
    c = claimable
    r = client.post(
        "/api/organiser/claim",
        json={"claim_token": c["claim_token"]},
        headers=_auth(c["org_token"]),
    )
    assert r.status_code == 200, r.text
    assert r.json()["organiser_id"] == c["org_id"]  # ownership from the token

    # It now shows up in the claimer's tenant-scoped list.
    mine = client.get("/api/organiser/tournaments", headers=_auth(c["org_token"]))
    assert any(row["id"] == c["tournament_id"] for row in mine.json())

    # And preview now reports it as claimed.
    preview = client.get("/api/organiser/claim/preview", params={"token": c["claim_token"]})
    assert preview.json()["already_claimed"] is True


def test_claim_requires_authentication(claimable):
    c = claimable
    r = client.post("/api/organiser/claim", json={"claim_token": c["claim_token"]})
    assert r.status_code == 401


def test_reused_link_cannot_reclaim(claimable):
    c = claimable
    first = client.post(
        "/api/organiser/claim",
        json={"claim_token": c["claim_token"]},
        headers=_auth(c["org_token"]),
    )
    assert first.status_code == 200
    second = client.post(
        "/api/organiser/claim",
        json={"claim_token": c["claim_token"]},
        headers=_auth(c["org_token"]),
    )
    assert second.status_code == 409  # already owned


def test_other_organiser_cannot_steal_claimed_tournament(claimable):
    c = claimable
    # First organiser claims it.
    client.post(
        "/api/organiser/claim",
        json={"claim_token": c["claim_token"]},
        headers=_auth(c["org_token"]),
    )
    # A second organiser with the same (leaked) link is refused and gains nothing.
    thief_id, thief_token = _signup_and_login(f"thief-{uuid.uuid4().hex}@example.com")
    try:
        r = client.post(
            "/api/organiser/claim",
            json={"claim_token": c["claim_token"]},
            headers=_auth(thief_token),
        )
        assert r.status_code == 409
        mine = client.get("/api/organiser/tournaments", headers=_auth(thief_token))
        assert mine.json() == []
    finally:
        db = SessionLocal()
        try:
            db.query(Organiser).filter(Organiser.id == thief_id).delete(synchronize_session=False)
            db.commit()
        finally:
            db.close()


def test_malformed_token_is_rejected(claimable):
    c = claimable
    r = client.post(
        "/api/organiser/claim",
        json={"claim_token": "not.a.jwt"},
        headers=_auth(c["org_token"]),
    )
    assert r.status_code == 400


def test_login_token_is_not_accepted_as_claim_token(claimable):
    """A session JWT must never work as a claim token (type discrimination)."""
    c = claimable
    r = client.post(
        "/api/organiser/claim",
        json={"claim_token": c["org_token"]},  # this is a role=organiser login token
        headers=_auth(c["org_token"]),
    )
    assert r.status_code == 400


def test_claim_token_is_not_accepted_as_login_token(claimable):
    """The reverse: a claim token can't authenticate an organiser route."""
    c = claimable
    r = client.get("/api/organiser/tournaments", headers=_auth(c["claim_token"]))
    assert r.status_code in (401, 403)  # missing/!organiser role


def test_preview_404_for_nonexistent_tournament():
    """A validly-signed token whose tournament doesn't exist yields 404, not 500."""
    token_for_ghost = create_claim_token(str(uuid.uuid4()))
    r = client.get("/api/organiser/claim/preview", params={"token": token_for_ghost})
    assert r.status_code == 404
