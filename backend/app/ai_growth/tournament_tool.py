"""Read-only tournament query for the AI Growth Engine.

The growth subsystem needs live tournament facts to ground generated content
(see backend/specs/growth-phase-1.md). This module is the *only* touch point,
and it is strictly read-only: it issues SELECTs via the ORM query API and never
UPDATE / INSERT / DELETE. It reuses `app.database` and does not import or call
any tournament/organiser service — keeping the growth code isolated from the
public product code (proved by tests/test_growth_isolation.py).

Conventions honoured (root CLAUDE.md):
- Only approved tournaments (`is_approved = true`) are ever returned.
- Status is *derived from dates*, never stored — we filter on the authoritative
  `Tournament.status` property, exactly as `services/tournament_service.py` does.
"""

from datetime import date, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.tournament import Tournament

# Statuses considered "active" for content generation: happening now or soon.
_ACTIVE_STATUSES = ("upcoming", "current")


def _to_dict(t: Tournament) -> dict:
    """Shape a Tournament row into the plain, JSON-serialisable dict the growth
    graph embeds in prompts. Built while the session is open so derived fields
    (`.status`) and dates are already loaded."""
    return {
        "title": t.title,
        "status": t.status,  # derived from dates (never stored)
        "format": t.format,
        "state": t.state,
        "venue": t.venue,
        "stage_notes": t.stage_notes,
        "dates": {
            "start": t.start_date.isoformat() if t.start_date else None,
            "end": t.end_date.isoformat() if t.end_date else None,
        },
        "registration_deadline": (
            t.registration_deadline.isoformat() if t.registration_deadline else None
        ),
        "prize_pool_rm": t.prize_pool_rm,
        "additional_prizes": t.additional_prizes,
        "max_teams": t.max_teams,
        "registration_link": t.registration_link,
    }


def get_active_tournaments(
    days_ahead: int = 30, db: Optional[Session] = None
) -> list[dict]:
    """Return approved tournaments that are current or starting within the next
    `days_ahead` days, ordered by start date.

    Read-only by construction — only `db.query(...)` SELECTs are issued.

    Args:
        days_ahead: window for *upcoming* tournaments. A tournament already in
            progress ("current") is always included; an upcoming one is included
            only if it starts on or before today + days_ahead.
        db: optional existing session (used by tests/callers that manage their
            own). When omitted, a short-lived session is opened and closed here.

    Returns:
        A list of plain dicts (see `_to_dict`), safe to serialise into prompts.
    """
    owns_session = db is None
    if db is None:
        db = SessionLocal()
    try:
        today = date.today()
        window_end = today + timedelta(days=days_ahead)

        # Coarse SQL pre-filter (approved + a window bound) narrows the rows
        # loaded; it can never drop a current/upcoming-in-window row:
        #   - end_date >= today       excludes already-finished ("past")
        #   - start_date <= window_end excludes upcoming beyond the window
        #   - dates not null           excludes date-less ("tbd") rows
        # The authoritative status check still happens in Python below, so the
        # derived-status property remains the single source of truth.
        rows = (
            db.query(Tournament)
            .filter(
                Tournament.is_approved == True,  # noqa: E712 — SQL boolean, not `is`
                Tournament.start_date.isnot(None),
                Tournament.end_date.isnot(None),
                Tournament.end_date >= today,
                Tournament.start_date <= window_end,
            )
            .order_by(Tournament.start_date.asc())
            .all()
        )

        # Derived-status is the authority (never stored) — keep only active ones.
        return [_to_dict(t) for t in rows if t.status in _ACTIVE_STATUSES]
    finally:
        if owns_session:
            db.close()
