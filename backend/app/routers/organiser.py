"""Organiser account + tenant-scoped tournament routes.

Auth issues an organiser JWT (`role: "organiser"`). Every tournament route
below takes its tenant identity from `require_organiser` (the token), and all
row access is delegated to `organiser_service`, where the three isolation rules
are enforced in one place. There is deliberately no unscoped query here.
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.auth import create_access_token, require_organiser
from app.database import get_db
from app.limiter import limiter
from app.schemas.organiser import (
    OrganiserLogin,
    OrganiserOut,
    OrganiserSignup,
    OrganiserTournamentCreate,
    OrganiserTournamentOut,
)
from app.schemas.tournament import MessageOut, TokenOut, TournamentUpdate
from app.services import organiser_service

router = APIRouter(prefix="/api/organiser", tags=["organiser"])


# ─── Auth ────────────────────────────────────────────────────────────────────

@router.post("/auth/signup", response_model=OrganiserOut, status_code=201)
@limiter.limit("5/minute")
def organiser_signup(request: Request, data: OrganiserSignup, db: Session = Depends(get_db)):
    """Register a new organiser account. Rate-limited to slow abuse."""
    try:
        return organiser_service.create_organiser(
            db,
            email=data.email,
            password=data.password,
            display_name=data.display_name,
            contact=data.contact,
        )
    except organiser_service.EmailAlreadyRegistered:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")


@router.post("/auth/login", response_model=TokenOut)
@limiter.limit("5/minute")
def organiser_login(request: Request, data: OrganiserLogin, db: Session = Depends(get_db)):
    """Authenticate an organiser and return a JWT carrying role='organiser'."""
    organiser = organiser_service.authenticate_organiser(db, email=data.email, password=data.password)
    if not organiser:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(sub=str(organiser.id), role="organiser")
    return {"access_token": token}


# ─── Tenant-scoped tournaments (organiser_id always from the token) ──────────

@router.get("/tournaments", response_model=list[OrganiserTournamentOut])
def list_my_tournaments(
    organiser_id: UUID = Depends(require_organiser),
    db: Session = Depends(get_db),
):
    """List ONLY this organiser's tournaments — the tenant boundary (rule 2)."""
    return organiser_service.list_own_tournaments(db, organiser_id)


@router.post("/tournaments", response_model=OrganiserTournamentOut, status_code=201)
def create_my_tournament(
    data: OrganiserTournamentCreate,
    organiser_id: UUID = Depends(require_organiser),
    db: Session = Depends(get_db),
):
    """Create a draft owned by the caller. Ownership is set from the token; any
    organiser_id in the body is ignored (rule 1)."""
    return organiser_service.create_tournament(db, organiser_id, data.model_dump())


@router.get("/tournaments/{tournament_id}", response_model=OrganiserTournamentOut)
def get_my_tournament(
    tournament_id: UUID,
    organiser_id: UUID = Depends(require_organiser),
    db: Session = Depends(get_db),
):
    """Fetch one of the caller's tournaments — 404 if it isn't theirs (rule 3)."""
    return organiser_service.get_own_tournament(db, tournament_id, organiser_id)


@router.patch("/tournaments/{tournament_id}", response_model=OrganiserTournamentOut)
def update_my_tournament(
    tournament_id: UUID,
    data: TournamentUpdate,
    organiser_id: UUID = Depends(require_organiser),
    db: Session = Depends(get_db),
):
    """Edit one of the caller's tournaments — ownership-checked, 404 on mismatch."""
    return organiser_service.update_tournament(
        db, tournament_id, organiser_id, data.model_dump(exclude_unset=True)
    )


@router.delete("/tournaments/{tournament_id}", response_model=MessageOut)
def delete_my_tournament(
    tournament_id: UUID,
    organiser_id: UUID = Depends(require_organiser),
    db: Session = Depends(get_db),
):
    """Delete one of the caller's tournaments — ownership-checked, 404 on mismatch."""
    organiser_service.delete_tournament(db, tournament_id, organiser_id)
    return {"detail": "Deleted"}
