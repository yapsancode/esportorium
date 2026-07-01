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
    format = Column(Enum("online", "offline", "hybrid", name="tournament_format"), nullable=True)
    state = Column(String, nullable=True, index=True)
    venue = Column(String, nullable=True)
    stage_notes = Column(String, nullable=True)  # e.g. "Group stage online, playoffs offline in KL"
    start_date = Column(Date, nullable=True, index=True)
    end_date = Column(Date, nullable=True)
    registration_deadline = Column(Date, nullable=True)
    prize_pool_rm = Column(Integer, nullable=True)
    additional_prizes = Column(ARRAY(String), default=[])
    max_teams = Column(Integer, nullable=True)
    organiser_name = Column(String, nullable=True)
    organiser_contact = Column(String, nullable=True)
    organiser_email = Column(String, nullable=True)
    registration_link = Column(String, nullable=True)
    banner_image = Column(String, nullable=True)
    is_approved = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)

    @property
    def status(self) -> str:
        # Manually-seeded tournaments may not have dates filled in yet.
        if self.start_date is None or self.end_date is None:
            return "tbd"
        today = date.today()
        if self.start_date > today:
            return "upcoming"
        elif self.start_date <= today <= self.end_date:
            return "current"
        return "past"
