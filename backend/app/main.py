import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.limiter import limiter
from app.observability import RequestContextMiddleware, configure_logging, configure_tracing
from app.routers import tournaments, admin, upload, organiser

# ─── Logging + tracing ─────────────────────────────────────────────────────────
# See app/observability.py — structured JSON logs (request_id + organiser_id
# auto-attached via contextvars) and OpenTelemetry request tracing.
configure_logging()

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
app.add_middleware(RequestContextMiddleware)
configure_tracing(app)

app.include_router(tournaments.router)
app.include_router(admin.router)
app.include_router(upload.router)
app.include_router(organiser.router)


@app.get("/health")
def health():
    return {"status": "ok"}
