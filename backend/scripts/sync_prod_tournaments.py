"""Copy approved tournaments from the live site down into the local dev database.

Why this exists: the AI Growth Engine reads tournaments from whatever
`DATABASE_URL` points at (see app/ai_growth/tournament_tool.py), and a fresh
local dev database has none. Without real rows the generate node has nothing to
ground `utility` posts in, so the graph can't be judged honestly. This pulls the
live listing down so local runs see the same tournaments the public site does.

Source is the *public* endpoint (`GET /api/tournaments`) — no Supabase
credentials needed, and it returns approved tournaments only, which is exactly
the set the growth engine is allowed to see anyway.

Safety: this script writes, so it refuses to run unless `DATABASE_URL` points at
localhost. It must never touch production.

Usage (from backend/):
    python scripts/sync_prod_tournaments.py --dry-run
    python scripts/sync_prod_tournaments.py
"""

import argparse
import os
import sys
from datetime import date, datetime
from pathlib import Path
from typing import Optional

import httpx
from dotenv import load_dotenv
from sqlalchemy.engine import make_url

# Import the app package when run as a plain script from backend/.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import SessionLocal  # noqa: E402
from app.models.tournament import Tournament  # noqa: E402

DEFAULT_API_BASE = "https://esportorium-backend-742836129132.asia-southeast1.run.app"

# Hosts we consider "local". Anything else means DATABASE_URL is pointed at a
# real database and this script has no business writing to it.
_LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1", ""}

# Copied verbatim from the API payload — plain scalars and JSON-ish columns.
# Deliberately absent:
#   status        — derived from dates, never stored (root CLAUDE.md)
#   organiser_id  — prod UUIDs don't exist in the local organisers table, so
#                   copying it would break the FK. The growth engine never reads it.
#   organiser_email — not exposed by the public endpoint.
_SCALAR_FIELDS = (
    "title",
    "game",
    "format",
    "state",
    "venue",
    "stage_notes",
    "description",
    "prize_pool_rm",
    "additional_prizes",
    "prize_breakdown",
    "max_teams",
    "organiser_name",
    "organiser_contact",
    "registration_link",
    "banner_image",
    "is_approved",
)

_DATE_FIELDS = ("start_date", "end_date", "registration_deadline")
_DATETIME_FIELDS = ("created_at", "updated_at")


def _assert_local_database() -> None:
    """Abort unless DATABASE_URL is a local database."""
    raw = os.getenv("DATABASE_URL", "")
    if not raw:
        raise SystemExit("DATABASE_URL is not set — check backend/.env")

    host = (make_url(raw).host or "").lower()
    if host not in _LOCAL_HOSTS:
        raise SystemExit(
            f"Refusing to run: DATABASE_URL points at '{host}', not localhost.\n"
            "This script writes rows and is only ever meant to populate a local "
            "dev database."
        )


def _parse_date(value: Optional[str]) -> Optional[date]:
    return date.fromisoformat(value) if value else None


def _parse_datetime(value: Optional[str]) -> Optional[datetime]:
    return datetime.fromisoformat(value) if value else None


def fetch_tournaments(api_base: str) -> list[dict]:
    """All approved tournaments from the live public listing."""
    url = f"{api_base.rstrip('/')}/api/tournaments"
    response = httpx.get(url, timeout=60.0)
    response.raise_for_status()
    return response.json()


def _apply(row: Tournament, payload: dict) -> None:
    """Copy an API payload onto a Tournament row, converting date strings."""
    for field in _SCALAR_FIELDS:
        setattr(row, field, payload.get(field))
    for field in _DATE_FIELDS:
        setattr(row, field, _parse_date(payload.get(field)))
    for field in _DATETIME_FIELDS:
        setattr(row, field, _parse_datetime(payload.get(field)))


def sync(payloads: list[dict], dry_run: bool = False) -> tuple[int, int]:
    """Upsert payloads into the local tournaments table, keyed on the prod id.

    Re-running is safe: existing rows are updated in place, so the local copy
    converges on whatever the live site currently shows.

    Returns:
        (created, updated) counts.
    """
    created = updated = 0
    db = SessionLocal()
    try:
        for payload in payloads:
            row = db.query(Tournament).filter(Tournament.id == payload["id"]).first()
            if row is None:
                row = Tournament(id=payload["id"])
                db.add(row)
                created += 1
            else:
                updated += 1
            _apply(row, payload)

        if dry_run:
            db.rollback()
        else:
            db.commit()
        return created, updated
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--api-base", default=DEFAULT_API_BASE, help="live backend base URL"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="fetch and report, but roll back instead of committing",
    )
    args = parser.parse_args()

    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
    _assert_local_database()

    payloads = fetch_tournaments(args.api_base)
    print(f"fetched {len(payloads)} approved tournaments from {args.api_base}")

    created, updated = sync(payloads, dry_run=args.dry_run)

    verb = "would create/update" if args.dry_run else "created/updated"
    print(f"{verb}: {created} new, {updated} existing")

    # The window the growth engine actually sees, so the run is self-checking.
    today = date.today()
    active = [
        p
        for p in payloads
        if p.get("end_date") and _parse_date(p["end_date"]) >= today
    ]
    print(f"active (current/upcoming) for the growth engine: {len(active)}")
    for p in sorted(active, key=lambda p: p["start_date"] or ""):
        print(f"  - {p['start_date']}  {p['title']}")

    if args.dry_run:
        print("\ndry run — nothing was written")


if __name__ == "__main__":
    main()
