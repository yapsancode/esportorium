"""Pydantic schemas for organiser accounts and their tenant-scoped tournaments.

The tournament create/response schemas deliberately do NOT expose `organiser_id`
as a settable field — ownership is set server-side from the JWT, never from the
request body (isolation rule 1). `organiser_id` appears only on the *response*
so callers can confirm who owns the row.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.schemas.tournament import TournamentAdminOut, TournamentBase


# ─── Accounts ────────────────────────────────────────────────────────────────

class OrganiserSignup(BaseModel):
    email:        EmailStr
    password:     str = Field(..., min_length=8, max_length=128)
    display_name: str = Field(..., min_length=2, max_length=100)
    contact:      str = Field(..., min_length=5, max_length=100)


class OrganiserLogin(BaseModel):
    email:    EmailStr
    password: str


class OrganiserOut(BaseModel):
    """Public-facing organiser profile — never includes the password hash."""
    id:           UUID
    email:        EmailStr
    display_name: str
    contact:      str
    created_at:   datetime

    model_config = {"from_attributes": True}


# ─── Organiser-owned tournaments ─────────────────────────────────────────────

class OrganiserTournamentCreate(TournamentBase):
    """Create a draft. Only `title` is required (inherited from TournamentBase);
    an organiser can save a skeleton and fill it in later. Any `organiser_id` or
    `is_approved` sent in the body is ignored — extra fields are dropped by
    Pydantic and the service sets ownership/approval itself.
    """


class OrganiserTournamentOut(TournamentAdminOut):
    """Response for an organiser's own rows — includes `organiser_id` so the
    owner is visible, plus organiser_email (the owner may see their own PII)."""
    organiser_id: Optional[UUID] = None


# ─── Claiming a tournament from an approval email ────────────────────────────

class ClaimRequest(BaseModel):
    """Body for POST /api/organiser/claim — the capability token from the email."""
    claim_token: str = Field(..., min_length=1)


class ClaimPreviewOut(BaseModel):
    """Unauthenticated context for the claim page, so it can show which
    tournament is being claimed before asking the visitor to sign in."""
    tournament_id: UUID
    title: str
    already_claimed: bool
