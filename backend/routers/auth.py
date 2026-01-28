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


load_dotenv()
router = APIRouter(prefix="/auth", tags=["auth"])

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def create_token(data: dict, expires_delta: timedelta):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
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

    # Access token (breve durata)
    access_token = create_token(
        {"sub": user.username, "uid": user.id, "type": "access"},
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    # Refresh token (lunga durata, anche questo JWT)
    refresh_token = create_token(
        {"sub": user.username, "uid": user.id, "type": "refresh"},
        timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )

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
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Token non valido")
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
def refresh(
    refresh_token: str = Cookie(None),
    db: Session = Depends(get_db),
):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token mancante")

    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Token non valido")
        username: str | None = payload.get("sub")
        user_id: int | None = payload.get("uid")
        if not username or not user_id:
            raise HTTPException(status_code=401, detail="Token non valido")
    except JWTError:
        raise HTTPException(status_code=401, detail="Refresh token non valido o scaduto")

    # Verifica che l'utente esista ancora ed sia abilitato
    user = db.query(models.Utente).filter(models.Utente.id == user_id).first()
    if not user or not user.enabled:
        raise HTTPException(status_code=401, detail="Utente non trovato o disabilitato")

    new_access_token = create_token(
        {"sub": user.username, "uid": user.id, "type": "access"},
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    response = JSONResponse(content={"message": "Token rinnovato"})
    response.set_cookie(
        "access_token", new_access_token,
        httponly=True, secure=False, samesite="Lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    return response


@router.post("/logout")
def logout():
    response = JSONResponse(content={"message": "Logout effettuato"})
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return response
