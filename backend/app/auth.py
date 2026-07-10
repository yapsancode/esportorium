"""Shared authentication layer for admin and organiser tokens.

Both roles use the same HS256 JWT scheme; they differ only by the `role` claim
carried in the token:

    { "sub": "<admin_username | organiser_uuid>", "role": "admin" | "organiser", "exp": ... }

`require_admin` and `require_organiser` are the two FastAPI dependencies that
gate routes. `require_organiser` returns the organiser's UUID straight from the
token — the single source of truth for tenant identity (isolation rule 1: the
organiser id always comes from the JWT, never from the request body or URL).
"""
import os
from datetime import datetime, timedelta, timezone
from uuid import UUID

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from app.observability import organiser_id_var

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError(
        "JWT_SECRET environment variable is not set — refusing to start with an insecure default"
    )
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))
# Claim links live in an email inbox, so they get a much longer life than a
# login session — the organiser may not act on the approval for weeks.
CLAIM_TOKEN_EXPIRE_DAYS = int(os.getenv("CLAIM_TOKEN_EXPIRE_DAYS", "30"))

# A single bearer scheme serves both roles. tokenUrl only affects the /docs
# "Authorize" helper; any valid token (admin or organiser) is accepted here and
# then discriminated by role in the dependency below.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/organiser/auth/login")


# ─── Passwords (bcrypt, same as the existing admin login) ────────────────────

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ─── Tokens ──────────────────────────────────────────────────────────────────

def create_access_token(sub: str, role: str) -> str:
    """Issue a JWT carrying identity (`sub`) and `role` (admin | organiser)."""
    payload = {
        "sub": sub,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _decode(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


# ─── Claim tokens ────────────────────────────────────────────────────────────
# A claim token is a capability: whoever holds the link (sent to the organiser's
# email on approval) may bind that one tournament to their account, provided it
# is still unowned. It carries `type: "claim"` so it can never be used as a login
# token, and vice versa.

def create_claim_token(tournament_id: str) -> str:
    """Issue a long-lived claim token for a specific tournament."""
    payload = {
        "sub": tournament_id,
        "type": "claim",
        "exp": datetime.now(timezone.utc) + timedelta(days=CLAIM_TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_claim_token(token: str) -> str:
    """Validate a claim token and return the tournament id it authorises.

    Raises 400 for a malformed/expired token or one that isn't a claim token —
    a login token must never be accepted here.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired claim link")
    if payload.get("type") != "claim" or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid claim link")
    return payload["sub"]


# ─── Route guards ────────────────────────────────────────────────────────────

async def require_admin(token: str = Depends(oauth2_scheme)) -> str:
    """Allow only admin tokens. Returns the admin username (`sub`).

    Async (no actual await needed — jwt.decode is fast, non-blocking CPU work)
    so FastAPI awaits it in the caller's task instead of routing it through
    run_in_threadpool. That distinction matters for require_organiser below.
    """
    payload = _decode(token)
    if payload.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return payload["sub"]


async def require_organiser(token: str = Depends(oauth2_scheme)) -> UUID:
    """Allow only organiser tokens. Returns the organiser's id (`sub`).

    This id is the ONLY source of tenant identity for organiser-scoped routes —
    every query downstream is filtered by it. Never trust an organiser_id that
    arrives in a request body or URL param instead.

    Must stay `async def`: a sync dependency of an async route is executed by
    FastAPI via run_in_threadpool, which copies the contextvars context into a
    worker thread — organiser_id_var.set() below would then mutate only that
    thread-local copy and never reach the request's actual async context,
    silently breaking organiser_id attribution in logs/traces.
    """
    payload = _decode(token)
    if payload.get("role") != "organiser":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organiser access required")
    try:
        organiser_id = UUID(payload["sub"])
    except (ValueError, TypeError, KeyError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    organiser_id_var.set(str(organiser_id))  # attaches to every log line for this request
    return organiser_id
