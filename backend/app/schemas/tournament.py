from datetime import date, datetime
from typing import Optional, Literal
from uuid import UUID
from pydantic import BaseModel, EmailStr, HttpUrl


class TournamentBase(BaseModel):
    title: str
    format: Literal["online", "offline"]
    state: Optional[str] = None
    venue: Optional[str] = None
    start_date: date
    end_date: date
    registration_deadline: date
    prize_pool_rm: int
    additional_prizes: list[str] = []
    max_teams: int
    organiser_name: str
    organiser_contact: str
    organiser_email: EmailStr
    registration_link: str
    banner_image: Optional[str] = None


class TournamentSubmit(TournamentBase):
    """Used by the public submit endpoint — creates an unapproved record."""
    pass


class TournamentCreate(TournamentBase):
    """Used by admin to manually create an approved tournament."""
    is_approved: bool = True


class TournamentUpdate(BaseModel):
    title: Optional[str] = None
    format: Optional[Literal["online", "offline"]] = None
    state: Optional[str] = None
    venue: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    registration_deadline: Optional[date] = None
    prize_pool_rm: Optional[int] = None
    additional_prizes: Optional[list[str]] = None
    max_teams: Optional[int] = None
    organiser_name: Optional[str] = None
    organiser_contact: Optional[str] = None
    organiser_email: Optional[EmailStr] = None
    registration_link: Optional[str] = None
    banner_image: Optional[str] = None
    is_approved: Optional[bool] = None


class TournamentOut(TournamentBase):
    id: UUID
    game: str
    is_approved: bool
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AuthLogin(BaseModel):
    username: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
