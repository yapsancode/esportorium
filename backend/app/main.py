from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.routers import tournaments, admin, upload

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Esportorium API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://esportorium.pages.dev"],
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
