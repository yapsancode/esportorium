import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Organiser(Base):
    """A tenant: one logged-in tournament organiser.

    Password hashing matches the admin login (bcrypt). `email` is unique and
    indexed — it's the login handle. Tournaments owned by an organiser point
    back here via `Tournament.organiser_id`; legacy public submissions have a
    null organiser_id and remain admin-managed exactly as before.
    """

    __tablename__ = "organisers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)  # bcrypt
    display_name = Column(String, nullable=False)
    contact = Column(String, nullable=False)  # WhatsApp or email
    created_at = Column(DateTime, default=datetime.utcnow)

    tournaments = relationship("Tournament", back_populates="organiser")
