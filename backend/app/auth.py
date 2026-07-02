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

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError(
        "JWT_SECRET environment variable is not set — refusing to start with an insecure default"
    )
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))

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


# ─── Route guards ────────────────────────────────────────────────────────────

def require_admin(token: str = Depends(oauth2_scheme)) -> str:
    """Allow only admin tokens. Returns the admin username (`sub`)."""
    payload = _decode(token)
    if payload.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return payload["sub"]


def require_organiser(token: str = Depends(oauth2_scheme)) -> UUID:
    """Allow only organiser tokens. Returns the organiser's id (`sub`).

    This id is the ONLY source of tenant identity for organiser-scoped routes —
    every query downstream is filtered by it. Never trust an organiser_id that
    arrives in a request body or URL param instead.
    """
    payload = _decode(token)
    if payload.get("role") != "organiser":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organiser access required")
    try:
        return UUID(payload["sub"])
    except (ValueError, TypeError, KeyError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
