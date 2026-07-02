"""Organiser account + tenant-scoped tournament routes.

Auth issues an organiser JWT (`role: "organiser"`). Every tournament route
below takes its tenant identity from `require_organiser` (the token), and all
row access is delegated to `organiser_service`, where the three isolation rules
are enforced in one place. There is deliberately no unscoped query here.
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.auth import create_access_token, require_organiser
from app.database import get_db
from app.limiter import limiter
from app.schemas.ingest import IngestDraftOut
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


# ─── Agentic ingest ──────────────────────────────────────────────────────────

_ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf",
}


@router.post("/ingest", response_model=IngestDraftOut)
@limiter.limit("10/minute")
async def ingest_announcement(
    request: Request,
    text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    organiser_id: UUID = Depends(require_organiser),
):
    """Extract tournament fields from a poster image, PDF, or raw text.

    Calls the Gemini vision model with a schema-constrained prompt, then runs
    deterministic guardrails (validators + transformers) on the output.

    Returns a draft with pre-filled fields and a flagged_fields list. Null
    fields in the draft need human review before submitting. The draft is never
    auto-published — the organiser reviews it, edits flagged fields, and submits
    via POST /tournaments, which enters the normal admin approval queue.

    Accepts multipart/form-data with either:
      - text  (str)            — raw announcement copy
      - file  (UploadFile)     — jpeg/png/gif/webp image or PDF poster
    Both can be provided together for maximum context.
    """
    from app.services.ingest import run_ingest  # lazy: keeps GOOGLE_API_KEY optional at boot

    if not text and not file:
        raise HTTPException(status_code=400, detail="Provide 'text', a file, or both")

    file_bytes: Optional[bytes] = None
    mime_type: Optional[str] = None
    if file:
        mime_type = file.content_type
        if mime_type not in _ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=415,
                detail=f"Unsupported file type '{mime_type}'. Allowed: jpeg, png, gif, webp, pdf",
            )
        file_bytes = await file.read()

    try:
        return run_ingest(text=text, file_bytes=file_bytes, mime_type=mime_type)
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=f"Extraction failed: {exc}")
    except RuntimeError as exc:
        # Missing API key or package not installed — config error, not caller error
        raise HTTPException(status_code=503, detail=str(exc))
