"""Shared pytest fixtures.

The key fixture here is _disable_rate_limit: the module-level `limiter`
singleton in app/limiter.py is shared by all @limiter.limit decorators, so
flipping limiter.enabled=False for the duration of every test bypasses all
rate-limit checks without touching production config.

This mirrors the Turnstile bypass pattern already in tournaments.py (where the
always-pass TURNSTILE_TEST_SECRET is used in non-production environments) —
test infrastructure disables the guard, production config is unchanged.
"""
import pytest
from dotenv import load_dotenv

# Load .env before any test module imports app code. app.database loads it too,
# but a test that imports app.auth (which reads JWT_SECRET at import time) before
# app.database would otherwise fail — this makes env availability import-order
# independent for the whole suite.
load_dotenv()

from app.limiter import limiter  # noqa: E402  (must follow load_dotenv)


@pytest.fixture(autouse=True)
def _disable_rate_limit():
    limiter.enabled = False
    yield
    limiter.enabled = True
