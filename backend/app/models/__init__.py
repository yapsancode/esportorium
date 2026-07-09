"""SQLAlchemy models.

Importing this package registers every table on `Base.metadata` and lets the
Tournament <-> Organiser relationship resolve. Alembic's env.py and the app both
rely on this.
"""
from app.models.organiser import Organiser  # noqa: F401
from app.models.tournament import Tournament  # noqa: F401
