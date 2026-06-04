import os
from datetime import datetime, timedelta, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.tournament import Tournament
from app.schemas.tournament import TournamentOut, TournamentCreate, TournamentUpdate, AuthLogin, TokenOut

router = APIRouter(prefix="/api/admin", tags=["admin"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/admin/auth/login")

JWT_SECRET = os.getenv("JWT_SECRET", "change-me")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))


def create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_admin(token: str = Depends(oauth2_scheme)):
    try:
        jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


# --- Auth ---

@router.post("/auth/login", response_model=TokenOut)
def admin_login(data: AuthLogin):
    """Authenticate admin and return a JWT."""
    admin_username = os.getenv("ADMIN_USERNAME")
    admin_hash = os.getenv("ADMIN_PASSWORD_HASH")
    if data.username != admin_username or not pwd_context.verify(data.password, admin_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token({"sub": data.username})
    return {"access_token": token}


# --- Tournament management ---

@router.get("/tournaments", response_model=list[TournamentOut], dependencies=[Depends(get_current_admin)])
def admin_list_all(db: Session = Depends(get_db)):
    """List all tournaments including unapproved."""
    return db.query(Tournament).order_by(Tournament.created_at.desc()).all()


@router.get("/submissions", response_model=list[TournamentOut], dependencies=[Depends(get_current_admin)])
def admin_list_submissions(db: Session = Depends(get_db)):
    """List pending (unapproved) submissions."""
    return db.query(Tournament).filter(Tournament.is_approved == False).order_by(Tournament.created_at.desc()).all()


@router.post("/tournaments", response_model=TournamentOut, status_code=201, dependencies=[Depends(get_current_admin)])
def admin_create_tournament(data: TournamentCreate, db: Session = Depends(get_db)):
    """Manually create an approved tournament."""
    tournament = Tournament(**data.model_dump())
    db.add(tournament)
    db.commit()
    db.refresh(tournament)
    return tournament


@router.put("/tournaments/{tournament_id}", response_model=TournamentOut, dependencies=[Depends(get_current_admin)])
def admin_update_tournament(tournament_id: UUID, data: TournamentUpdate, db: Session = Depends(get_db)):
    """Edit a tournament."""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(tournament, field, value)
    db.commit()
    db.refresh(tournament)
    return tournament


@router.patch("/tournaments/{tournament_id}/approve", response_model=TournamentOut, dependencies=[Depends(get_current_admin)])
def admin_approve(tournament_id: UUID, db: Session = Depends(get_db)):
    """Approve a pending submission."""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    tournament.is_approved = True
    db.commit()
    db.refresh(tournament)
    return tournament


@router.patch("/tournaments/{tournament_id}/reject", dependencies=[Depends(get_current_admin)])
def admin_reject(tournament_id: UUID, db: Session = Depends(get_db)):
    """Reject and delete a pending submission."""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    db.delete(tournament)
    db.commit()
    return {"detail": "Submission rejected and removed"}


@router.delete("/tournaments/{tournament_id}", dependencies=[Depends(get_current_admin)])
def admin_delete_tournament(tournament_id: UUID, db: Session = Depends(get_db)):
    """Delete a tournament."""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    db.delete(tournament)
    db.commit()
    return {"detail": "Deleted"}
