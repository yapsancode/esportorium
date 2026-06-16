import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.database import Base, engine
from app.limiter import limiter
from app.routers import tournaments, admin, upload

Base.metadata.create_all(bind=engine)

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


@app.get("/health")
def health():
    return {"status": "ok"}
