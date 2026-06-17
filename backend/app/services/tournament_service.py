from typing import Optional, Literal
from sqlalchemy.orm import Session
from app.models.tournament import Tournament


def get_approved_tournaments(
    db: Session,
    status_filter: Optional[Literal["upcoming", "current", "past"]] = None,
    state_filter: Optional[str] = None,
    format_filter: Optional[Literal["online", "offline"]] = None,
) -> list[Tournament]:
    query = db.query(Tournament).filter(Tournament.is_approved == True)

    # Format filter
    if format_filter:
        query = query.filter(Tournament.format == format_filter)

    # State filter — online tournaments always appear regardless of state selection
    if state_filter and format_filter != "online":
        query = query.filter(
            (Tournament.format == "online") | (Tournament.state == state_filter)
        )

    tournaments = query.order_by(Tournament.start_date.asc()).all()

    # Status filter is applied in Python (status is derived, not stored)
    if status_filter:
        tournaments = [t for t in tournaments if t.status == status_filter]

    return tournaments
