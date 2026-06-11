"""Unit tests for the derived Tournament.status property.

Pure logic — constructs Tournament objects in memory, no database needed.
"""
from datetime import date, timedelta

from app.models.tournament import Tournament

TODAY = date.today()


def _make(start: date, end: date) -> Tournament:
    return Tournament(start_date=start, end_date=end)


def test_status_upcoming():
    t = _make(TODAY + timedelta(days=3), TODAY + timedelta(days=4))
    assert t.status == "upcoming"


def test_status_current_single_day():
    t = _make(TODAY, TODAY)
    assert t.status == "current"


def test_status_current_multi_day():
    t = _make(TODAY - timedelta(days=1), TODAY + timedelta(days=1))
    assert t.status == "current"


def test_status_past():
    t = _make(TODAY - timedelta(days=5), TODAY - timedelta(days=4))
    assert t.status == "past"
