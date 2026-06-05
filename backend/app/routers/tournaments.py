import os
import logging
from typing import Optional, Literal
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.tournament import Tournament
from app.schemas.tournament import TournamentOut, TournamentSubmit
from app.services.notifications import notify_discord_new_submission

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/tournaments", tags=["tournaments"])


# ─── Cloudflare Turnstile verification ───────────────────────────────────────

TURNSTILE_SECRET = os.getenv("TURNSTILE_SECRET_KEY", "")
TURNSTILE_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
# Test secret that always passes — safe for local dev, replace in production.
TURNSTILE_TEST_SECRET = "1x0000000000000000000000000000000AA"


async def verify_turnstile(token: str) -> bool:
    """Returns True if the Turnstile token is valid."""
    secret = TURNSTILE_SECRET or TURNSTILE_TEST_SECRET
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.post(
                TURNSTILE_URL,
                data={"secret": secret, "response": token},
            )
            return resp.json().get("success", False)
    except Exception as exc:
        logger.warning("Turnstile verification error: %s", exc)
        return False


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.get("", response_model=list[TournamentOut])
def list_tournaments(
    status: Optional[Literal["upcoming", "current", "past"]] = None,
    state: Optional[str] = None,
    format: Optional[Literal["online", "offline"]] = None,
    db: Session = Depends(get_db),
):
    """List all approved tournaments with optional filters."""
    from app.services.tournament_service import get_approved_tournaments
    return get_approved_tournaments(db, status_filter=status, state_filter=state, format_filter=format)


@router.get("/{tournament_id}", response_model=TournamentOut)
def get_tournament(tournament_id: UUID, db: Session = Depends(get_db)):
    """Get a single approved tournament by ID."""
    tournament = db.query(Tournament).filter(
        Tournament.id == tournament_id,
        Tournament.is_approved == True,
    ).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return tournament


@router.post("/submit", response_model=TournamentOut, status_code=201)
async def submit_tournament(
    data: TournamentSubmit,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Public endpoint for organisers to submit a tournament for review.

    Validates the Cloudflare Turnstile token before inserting into the database,
    then fires a Discord notification in the background.
    """
    # 1. Verify Turnstile — block bots before touching the database
    if not await verify_turnstile(data.turnstile_token):
        raise HTTPException(status_code=400, detail="Bot verification failed. Please try again.")

    # 2. Build the DB record — exclude the Turnstile token (not a DB column)
    payload = data.model_dump(exclude={"turnstile_token"})
    tournament = Tournament(**payload, is_approved=False)
    db.add(tournament)
    db.commit()
    db.refresh(tournament)

    # 3. Notify admin via Discord (non-blocking)
    background_tasks.add_task(
        notify_discord_new_submission,
        title=tournament.title,
        organiser=tournament.organiser_name,
        format_=tournament.format,
        state=tournament.state,
    )

    return tournament
