from datetime import date
from typing import Optional, Literal
from sqlalchemy.orm import Session
from app.models.tournament import Tournament


def get_approved_tournaments(
    db: Session,
    status_filter: Optional[Literal["upcoming", "current", "past"]] = None,
    state_filter: Optional[str] = None,
) -> list[Tournament]:
    query = db.query(Tournament).filter(Tournament.is_approved == True)

    if state_filter:
        # Online tournaments always appear; offline tournaments are filtered by state
        query = query.filter(
            (Tournament.format == "online") | (Tournament.state == state_filter)
        )

    tournaments = query.order_by(Tournament.start_date.asc()).all()

    if status_filter:
        tournaments = [t for t in tournaments if t.status == status_filter]

    return tournaments
