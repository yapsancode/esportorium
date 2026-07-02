import logging
import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.limiter import limiter
from app.routers import tournaments, admin, upload, organiser

# ─── Logging ─────────────────────────────────────────────────────────────────
# Uvicorn only configures its own loggers (uvicorn.*); the root logger stays
# at WARNING, so app.* INFO messages are silently dropped. Add an explicit
# StreamHandler to the "app" namespace so ingest + other app loggers are
# visible in the uvicorn terminal without touching uvicorn's own log format.
_app_logger = logging.getLogger("app")
if not _app_logger.handlers:  # guard against duplicate handlers on uvicorn --reload
    _handler = logging.StreamHandler(sys.stdout)
    _handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)-8s %(name)s: %(message)s"))
    _app_logger.addHandler(_handler)
_app_logger.setLevel(logging.INFO)
_app_logger.propagate = False  # don't double-print via root's last-resort handler

# ─── Schema management ────────────────────────────────────────────────────────
# Schema is managed by Alembic (see backend/alembic/) — run `alembic upgrade head`
# to apply migrations. No create_all() here; it would create tables outside
# migration history and mask drift between models and the applied schema.

app = FastAPI(title="Esportorium API", version="0.1.0")

# Rate limiting — see app/limiter.py. Endpoints opt in with @limiter.limit(...).
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_origins_env = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173",
)
allowed_origins = [o.strip() for o in _origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tournaments.router)
app.include_router(admin.router)
app.include_router(upload.router)
app.include_router(organiser.router)


@app.get("/health")
def health():
    return {"status": "ok"}
