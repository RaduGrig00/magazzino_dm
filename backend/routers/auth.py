from fastapi import APIRouter, Depends, Form, HTTPException, Cookie
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from config import get_db
from security import verify_password
import models
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
import os
from dotenv import load_dotenv
import uuid


load_dotenv()
router = APIRouter(prefix="/auth", tags=["auth"])

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


@router.post("/login")
def login(
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    user = db.query(models.Utente).filter(models.Utente.username == username).first()

    if not user or not verify_password(password, user.password):
        raise HTTPException(status_code=401, detail="Credenziali non valide")

    if not user.enabled:
        raise HTTPException(status_code=403, detail="Utente disabilitato")

    # Access token (JWT)
    access_token = create_access_token({"sub": user.username, "uid": user.id})

    # Refresh token
    refresh_token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    db_refresh = models.RefreshToken(
        user_id=user.id,
        token=refresh_token,
        expires_at=expires_at,
    )
    db.add(db_refresh)
    db.commit()

    response = JSONResponse(content={"message": "Login effettuato"})
    response.set_cookie(
        "access_token", access_token,
        httponly=True, secure=False, samesite="Lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        "refresh_token", refresh_token,
        httponly=True, secure=False, samesite="Lax",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )
    return response


def get_current_user(
    access_token: str = Cookie(None),
    db: Session = Depends(get_db),
):
    if not access_token:
        raise HTTPException(status_code=401, detail="Token mancante")

    try:
        payload = jwt.decode(access_token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str | None = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Token non valido")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token non valido o scaduto")

    user = db.query(models.Utente).filter(models.Utente.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="Utente non trovato")

    return user


@router.get("/me")
def read_me(current_user: models.Utente = Depends(get_current_user)):
    return {"username": current_user.username, "email": current_user.email}


@router.post("/refresh")
def refresh_token(
    refresh_token: str = Cookie(None),
    db: Session = Depends(get_db),
):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token mancante")

    db_token = (
        db.query(models.RefreshToken)
        .filter(models.RefreshToken.token == refresh_token)
        .first()
    )
    if not db_token or db_token.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Refresh token non valido o scaduto")

    user = db.query(models.Utente).filter(models.Utente.id == db_token.user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="Utente non trovato")

    new_access_token = create_access_token({"sub": user.username, "uid": user.id})

    response = JSONResponse(content={"message": "Token rinnovato"})
    response.set_cookie(
        "access_token", new_access_token,
        httponly=True, secure=False, samesite="Lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    return response


@router.post("/logout")
def logout(
    refresh_token: str = Cookie(None),
    db: Session = Depends(get_db),
):
    if refresh_token:
        db.query(models.RefreshToken).filter(
            models.RefreshToken.token == refresh_token
        ).delete()
        db.commit()

    response = JSONResponse(content={"message": "Logout effettuato"})
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return response
