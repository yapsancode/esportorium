"""Guardrail layer for agentic ingest.

Two kinds of function — deliberately separate because they fail differently:

  Validators  answer yes/no; flag the field when they return False.
  Transformers reshape the model's raw string AND sanity-check the result.
              They can fail two ways: can't parse (flag) OR parsed to a
              silently wrong value (also flag). Each one range-checks its output.

All functions are pure (no I/O, no global state) so they are trivially
unit-testable and every rejection they produce is a ready-made fixture for the
Item 3 eval set.
"""
import re
from datetime import date, datetime
from typing import Optional


# ─── Validators ──────────────────────────────────────────────────────────────

def is_valid_url(s: str) -> bool:
    """True if s is an http/https URL with a non-empty host."""
    return bool(re.match(r'^https?://[^\s/$.?#][^\s]*$', s.strip()))


def is_valid_my_phone(s: str) -> bool:
    """True if s looks like a Malaysian phone number.

    Accepts +60, 60, or 0 prefix followed by 8–10 digits (covers mobile and
    some landlines). Strips common separators before matching.
    """
    digits = re.sub(r'[\s\-()+]', '', s.strip())
    return bool(re.match(r'^(60|0)\d{8,10}$', digits))


# ─── Transformers ─────────────────────────────────────────────────────────────

def normalize_rm(s: str) -> Optional[int]:
    """'RM 5,000' | '5K' | '10000' | 'RM5k' → int.

    Returns None (flag it) if:
    - the string can't be parsed as a number
    - the result is negative or exceeds RM 10,000,000 (implausible prize pool)
    """
    cleaned = re.sub(r'(?i)rm', '', s).strip().replace(',', '').replace(' ', '').upper()
    try:
        if cleaned.endswith('K'):
            value = int(float(cleaned[:-1]) * 1_000)
        elif cleaned.endswith('M'):
            value = int(float(cleaned[:-1]) * 1_000_000)
        else:
            value = int(float(cleaned))
    except (ValueError, AttributeError):
        return None
    return value if 0 <= value <= 10_000_000 else None


def parse_date(s: str) -> Optional[date]:
    """Parse ISO or common date string to a date.

    Returns None (flag it) if:
    - the string doesn't match any known format
    - the parsed year is before 2020 (almost certainly a parse/OCR error)
    """
    for fmt in (
        '%Y-%m-%d',
        '%d/%m/%Y', '%d-%m-%Y',
        '%Y/%m/%d',
        '%d %B %Y', '%d %b %Y',
        '%B %d, %Y', '%b %d, %Y',
    ):
        try:
            d = datetime.strptime(s.strip(), fmt).date()
            return d if d.year >= 2020 else None
        except ValueError:
            continue
    return None


def parse_int(s: str) -> Optional[int]:
    """Parse a team-count string to int.

    Returns None (flag it) if:
    - unparseable
    - outside the plausible range [2, 10 000]
    """
    try:
        v = int(float(s.strip().replace(',', '')))
        return v if 2 <= v <= 10_000 else None
    except (ValueError, AttributeError):
        return None
