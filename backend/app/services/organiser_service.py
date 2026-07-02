"""Tenant-isolated organiser operations — the single enforcement point.

Every organiser-scoped read/write goes through this module, so the three
isolation rules live in exactly one place the tests can target:

  RULE 1  organiser_id always comes from the JWT (the `organiser_id` argument,
          which the router sources from `require_organiser`), never from a
          request body or URL param.
  RULE 2  every query is filtered by that organiser_id — no unscoped SELECT.
  RULE 3  single-row operations fetch by (id AND organiser_id) and raise 404 —
          not 403 — on a miss, so we never leak that another tenant's row exists.
"""
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.auth import hash_password, verify_password
from app.models.organiser import Organiser
from app.models.tournament import Tournament


class EmailAlreadyRegistered(Exception):
    """Raised by create_organiser when the email is already taken."""


# ─── Accounts ────────────────────────────────────────────────────────────────

def create_organiser(
    db: Session, *, email: str, password: str, display_name: str, contact: str
) -> Organiser:
    if db.query(Organiser).filter(Organiser.email == email).first():
        raise EmailAlreadyRegistered()
    organiser = Organiser(
        email=email,
        password_hash=hash_password(password),
        display_name=display_name,
        contact=contact,
    )
    db.add(organiser)
    db.commit()
    db.refresh(organiser)
    return organiser


def authenticate_organiser(db: Session, *, email: str, password: str) -> Organiser | None:
    organiser = db.query(Organiser).filter(Organiser.email == email).first()
    if not organiser or not verify_password(password, organiser.password_hash):
        return None
    return organiser


# ─── Tenant-scoped tournament operations ─────────────────────────────────────

def list_own_tournaments(db: Session, organiser_id: UUID) -> list[Tournament]:
    # RULE 2: filtered by the token's organiser_id.
    return (
        db.query(Tournament)
        .filter(Tournament.organiser_id == organiser_id)
        .order_by(Tournament.created_at.desc())
        .all()
    )


def _get_owned_or_404(db: Session, tournament_id: UUID, organiser_id: UUID) -> Tournament:
    # RULE 3: match on BOTH id and organiser_id in one query. A row owned by
    # another tenant is indistinguishable from one that doesn't exist -> 404.
    tournament = (
        db.query(Tournament)
        .filter(
            Tournament.id == tournament_id,
            Tournament.organiser_id == organiser_id,
        )
        .first()
    )
    if tournament is None:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return tournament


def get_own_tournament(db: Session, tournament_id: UUID, organiser_id: UUID) -> Tournament:
    return _get_owned_or_404(db, tournament_id, organiser_id)


def create_tournament(db: Session, organiser_id: UUID, data: dict) -> Tournament:
    # RULE 1: ownership comes from the token. Strip any organiser_id the caller
    # tried to smuggle through the body, then set it ourselves. Organiser drafts
    # are never auto-approved — admin still gates what goes public.
    data.pop("organiser_id", None)
    data.pop("is_approved", None)
    tournament = Tournament(**data, organiser_id=organiser_id, is_approved=False)
    db.add(tournament)
    db.commit()
    db.refresh(tournament)
    return tournament


def update_tournament(
    db: Session, tournament_id: UUID, organiser_id: UUID, updates: dict
) -> Tournament:
    tournament = _get_owned_or_404(db, tournament_id, organiser_id)  # RULE 3
    # RULE 1: ownership can never be reassigned via an edit. Organisers also
    # cannot flip their own approval — that stays an admin decision.
    updates.pop("organiser_id", None)
    updates.pop("is_approved", None)
    for field, value in updates.items():
        setattr(tournament, field, value)
    db.commit()
    db.refresh(tournament)
    return tournament


def delete_tournament(db: Session, tournament_id: UUID, organiser_id: UUID) -> None:
    tournament = _get_owned_or_404(db, tournament_id, organiser_id)  # RULE 3
    db.delete(tournament)
    db.commit()
