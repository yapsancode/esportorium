from typing import Optional, Literal
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.tournament import Tournament
from app.schemas.tournament import TournamentOut, TournamentSubmit

router = APIRouter(prefix="/api/tournaments", tags=["tournaments"])


@router.get("", response_model=list[TournamentOut])
def list_tournaments(
    status: Optional[Literal["upcoming", "current", "past"]] = None,
    state: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List all approved tournaments, optionally filtered by status and state."""
    # TODO: implement filtering
    tournaments = db.query(Tournament).filter(Tournament.is_approved == True).all()
    return tournaments


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
def submit_tournament(data: TournamentSubmit, db: Session = Depends(get_db)):
    """Public endpoint for organisers to submit a tournament for review."""
    # TODO: implement submission logic
    tournament = Tournament(**data.model_dump(), is_approved=False)
    db.add(tournament)
    db.commit()
    db.refresh(tournament)
    return tournament
