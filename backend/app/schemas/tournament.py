from datetime import date, datetime
from typing import Optional, Literal
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


def _reject_html(v: str) -> str:
    """Strip whitespace and reject obvious HTML/script injection."""
    v = v.strip()
    for bad in ("<script", "javascript:", "onerror=", "onload="):
        if bad.lower() in v.lower():
            raise ValueError("Input contains disallowed content")
    return v


class PrizeBreakdownItem(BaseModel):
    """One row of the cash prize split, e.g. {"placement": "Champion", "reward": "RM 5,000"}."""
    placement: str = Field(..., min_length=1, max_length=50, strip_whitespace=True)
    reward:    str = Field(..., min_length=1, max_length=100, strip_whitespace=True)

    @field_validator("placement", "reward", mode="before")
    @classmethod
    def _clean(cls, v: str) -> str:
        return _reject_html(str(v))


# ─── Shared base ─────────────────────────────────────────────────────────────
# Only `title` is required here. Everything else is optional — both for admin
# manual seeding (e.g. scraped listings) and public submissions, which can
# also be incomplete drafts for admins to fill in during review.

class TournamentBase(BaseModel):
    title:                 str = Field(..., min_length=3, max_length=200, strip_whitespace=True)
    format:                Optional[Literal["online", "offline", "hybrid"]] = None
    state:                 Optional[str] = Field(default=None, max_length=100)
    venue:                 Optional[str] = Field(default=None, max_length=300, strip_whitespace=True)
    stage_notes:           Optional[str] = Field(default=None, max_length=300, strip_whitespace=True)
    description:           Optional[str] = Field(default=None, max_length=2000, strip_whitespace=True)
    start_date:            Optional[date] = None
    end_date:              Optional[date] = None
    registration_deadline: Optional[date] = None
    prize_pool_rm:         Optional[int] = Field(default=None, ge=0, le=10_000_000)
    additional_prizes:     list[str] = Field(default_factory=list, max_length=10)
    prize_breakdown:       list[PrizeBreakdownItem] = Field(default_factory=list, max_length=15)
    max_teams:             Optional[int] = Field(default=None, ge=2, le=10_000)
    organiser_name:        Optional[str] = Field(default=None, max_length=100, strip_whitespace=True)
    organiser_contact:     Optional[str] = Field(default=None, max_length=100, strip_whitespace=True)
    registration_link:     Optional[str] = Field(default=None, max_length=500)
    banner_image:          Optional[str] = Field(default=None, max_length=500)

    # ── Field validators ──────────────────────────────────────────────────────

    @field_validator("title", "organiser_name", "organiser_contact", "description", mode="before")
    @classmethod
    def strip_and_no_html(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return _reject_html(str(v))

    @field_validator("additional_prizes", mode="before")
    @classmethod
    def validate_prizes(cls, v: list) -> list:
        return [str(p)[:100].strip() for p in v][:10]

    @field_validator("registration_link", mode="before")
    @classmethod
    def validate_url(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        v = v.strip()
        if not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("Registration link must start with http:// or https://")
        return v

    # ── Cross-field validators ────────────────────────────────────────────────

    @model_validator(mode="after")
    def check_date_logic(self) -> "TournamentBase":
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        if self.registration_deadline and self.start_date and self.registration_deadline > self.start_date:
            raise ValueError("registration_deadline must be on or before start_date")
        if self.format in ("offline", "hybrid") and not self.state:
            raise ValueError("state is required for offline and hybrid tournaments")
        return self


# ─── Public submit schema (adds Turnstile token + future-date check) ─────────

class TournamentSubmit(TournamentBase):
    """Used by the public submit endpoint — creates an unapproved record.

    Only `title` is required, same as TournamentBase; everything else is
    optional so organisers can submit incomplete drafts for admins to fill in.
    """
    organiser_email:        Optional[EmailStr] = None  # internal notification address; never exposed in public responses
    turnstile_token:        str = Field(..., min_length=1, description="Cloudflare Turnstile response token")

    @model_validator(mode="after")
    def check_dates_in_future(self) -> "TournamentSubmit":
        if self.start_date is not None:
            today = date.today()
            if self.start_date < today:
                raise ValueError("start_date must be today or in the future")
        return self


# ─── Admin schemas ────────────────────────────────────────────────────────────

class TournamentCreate(TournamentBase):
    """Used by admin to manually create a tournament — no Turnstile, no future-date
    restriction, and only `title` is required (manual seeding often has gaps)."""
    organiser_email: Optional[EmailStr] = None
    is_approved: bool = True


class TournamentUpdate(BaseModel):
    title:                 Optional[str]                      = Field(default=None, min_length=3, max_length=200)
    format:                Optional[Literal["online", "offline", "hybrid"]] = None
    state:                 Optional[str]                      = None
    venue:                 Optional[str]                      = None
    stage_notes:           Optional[str]                      = None
    description:           Optional[str]                      = Field(default=None, max_length=2000)
    start_date:            Optional[date]                     = None
    end_date:              Optional[date]                     = None
    registration_deadline: Optional[date]                     = None
    prize_pool_rm:         Optional[int]                      = Field(default=None, ge=0)
    additional_prizes:     Optional[list[str]]                = None
    prize_breakdown:       Optional[list[PrizeBreakdownItem]] = None
    max_teams:             Optional[int]                      = Field(default=None, ge=2)
    organiser_name:        Optional[str]                      = Field(default=None, max_length=100)
    organiser_contact:     Optional[str]                      = Field(default=None, max_length=100)
    organiser_email:       Optional[EmailStr]                 = None
    registration_link:     Optional[str]                      = None
    banner_image:          Optional[str]                      = None
    is_approved:           Optional[bool]                     = None


# ─── Response schema ──────────────────────────────────────────────────────────

class TournamentOut(TournamentBase):
    """Public response — deliberately omits organiser_email (internal PII)."""
    id:         UUID
    game:       str
    is_approved: bool
    status:     str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class TournamentAdminOut(TournamentOut):
    """Admin response — includes the organiser's notification email."""
    organiser_email: Optional[EmailStr] = None


# ─── Auth schemas ─────────────────────────────────────────────────────────────

class MessageOut(BaseModel):
    """Simple {"detail": "..."} response for actions with no body to return."""
    detail: str


class AuthLogin(BaseModel):
    username: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
