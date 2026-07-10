import os
from uuid import UUID
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.auth import create_access_token, create_claim_token, require_admin, verify_password
from app.database import get_db
from app.limiter import limiter
from app.models.tournament import Tournament
from app.schemas.tournament import TournamentAdminOut, TournamentCreate, TournamentUpdate, AuthLogin, TokenOut, MessageOut
from app.services.notifications import (
    notify_discord_tournament_approved,
    notify_discord_tournament_rejected,
)
from app.services.email import send_approval_email, send_rejection_email

router = APIRouter(prefix="/api/admin", tags=["admin"])

# Base URL of the public site, used to build organiser-facing links in emails.
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "https://esportorium.com").rstrip("/")


# --- Auth ---

@router.post("/auth/login", response_model=TokenOut)
@limiter.limit("5/minute")
def admin_login(request: Request, data: AuthLogin):
    """Authenticate admin and return a JWT. Rate-limited to slow brute-force attempts."""
    admin_username = os.getenv("ADMIN_USERNAME")
    admin_hash = os.getenv("ADMIN_PASSWORD_HASH")
    if data.username != admin_username or not verify_password(data.password, admin_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(sub=data.username, role="admin")
    return {"access_token": token}


# --- Tournament management ---

@router.get("/tournaments", response_model=list[TournamentAdminOut], dependencies=[Depends(require_admin)])
def admin_list_all(db: Session = Depends(get_db)):
    """List all tournaments including unapproved."""
    return db.query(Tournament).order_by(Tournament.created_at.desc()).all()


@router.get("/submissions", response_model=list[TournamentAdminOut], dependencies=[Depends(require_admin)])
def admin_list_submissions(db: Session = Depends(get_db)):
    """List pending (unapproved) submissions."""
    return db.query(Tournament).filter(Tournament.is_approved == False).order_by(Tournament.created_at.desc()).all()


@router.post("/tournaments", response_model=TournamentAdminOut, status_code=201, dependencies=[Depends(require_admin)])
def admin_create_tournament(data: TournamentCreate, db: Session = Depends(get_db)):
    """Manually create an approved tournament."""
    tournament = Tournament(**data.model_dump())
    db.add(tournament)
    db.commit()
    db.refresh(tournament)
    return tournament


@router.put("/tournaments/{tournament_id}", response_model=TournamentAdminOut, dependencies=[Depends(require_admin)])
def admin_update_tournament(tournament_id: UUID, data: TournamentUpdate, db: Session = Depends(get_db)):
    """Edit a tournament."""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(tournament, field, value)
    db.commit()
    db.refresh(tournament)
    return tournament


@router.patch("/tournaments/{tournament_id}/approve", response_model=TournamentAdminOut, dependencies=[Depends(require_admin)])
def admin_approve(tournament_id: UUID, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Approve a pending submission and announce it on Discord."""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    tournament.is_approved = True
    db.commit()
    db.refresh(tournament)
    background_tasks.add_task(
        notify_discord_tournament_approved,
        tournament_id=str(tournament.id),
        title=tournament.title,
        organiser=tournament.organiser_name or "Unknown",
        format_=tournament.format,
        state=tournament.state,
        prize_pool_rm=tournament.prize_pool_rm,
        start_date=str(tournament.start_date) if tournament.start_date else "TBD",
        registration_link=tournament.registration_link,
        banner_image=tournament.banner_image,
    )
    # Manually-seeded tournaments may not have an organiser email on file — nothing to notify.
    if tournament.organiser_email:
        # Offer a claim link only when the tournament has no account owner yet.
        # A tournament an organiser created from their own dashboard is already
        # owned, so there's nothing to claim.
        claim_url = None
        if tournament.organiser_id is None:
            claim_token = create_claim_token(str(tournament.id))
            claim_url = f"{FRONTEND_BASE_URL}/organiser/claim?token={claim_token}"
        background_tasks.add_task(
            send_approval_email,
            to=tournament.organiser_email,
            title=tournament.title,
            registration_link=tournament.registration_link or "TBD",
            start_date=str(tournament.start_date) if tournament.start_date else "TBD",
            tournament_url=f"{FRONTEND_BASE_URL}/tournament/{tournament.id}",
            claim_url=claim_url,
        )
    return tournament


@router.patch("/tournaments/{tournament_id}/reject", response_model=MessageOut, dependencies=[Depends(require_admin)])
def admin_reject(tournament_id: UUID, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Reject and delete a pending submission, notify admin on Discord."""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    title = tournament.title
    organiser = tournament.organiser_name or "Unknown"
    organiser_email = tournament.organiser_email
    db.delete(tournament)
    db.commit()
    background_tasks.add_task(notify_discord_tournament_rejected, title=title, organiser=organiser)
    if organiser_email:
        background_tasks.add_task(send_rejection_email, to=organiser_email, title=title)
    return {"detail": "Submission rejected and removed"}


@router.delete("/tournaments/{tournament_id}", response_model=MessageOut, dependencies=[Depends(require_admin)])
def admin_delete_tournament(tournament_id: UUID, db: Session = Depends(get_db)):
    """Delete a tournament."""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    db.delete(tournament)
    db.commit()
    return {"detail": "Deleted"}
