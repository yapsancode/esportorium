import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Integer, Boolean, Date, DateTime, Enum, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Tournament(Base):
    __tablename__ = "tournaments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    game = Column(String, default="Mobile Legends")
    format = Column(Enum("online", "offline", name="tournament_format"), nullable=False)
    state = Column(String, nullable=True, index=True)
    venue = Column(String, nullable=True)
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False)
    registration_deadline = Column(Date, nullable=False)
    prize_pool_rm = Column(Integer, nullable=False)
    additional_prizes = Column(ARRAY(String), default=[])
    max_teams = Column(Integer, nullable=False)
    organiser_name = Column(String, nullable=False)
    organiser_contact = Column(String, nullable=False)
    organiser_email = Column(String, nullable=False)
    registration_link = Column(String, nullable=False)
    banner_image = Column(String, nullable=True)
    is_approved = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)

    @property
    def status(self) -> str:
        today = date.today()
        if self.start_date > today:
            return "upcoming"
        elif self.start_date <= today <= self.end_date:
            return "current"
        return "past"
