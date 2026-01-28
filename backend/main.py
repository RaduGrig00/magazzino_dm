import asyncio
from contextlib import asynccontextmanager
import logging
from typing import Any, List, Optional
from fastapi import FastAPI, Depends, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import models, schemas
from routers.auth import router as auth_router
from routers import weather as weather_router
from fastapi.middleware.cors import CORSMiddleware
from routers.auth import get_current_user
from config import db_engine, db_session, weather_client, osm_client
from config import Base

models.Base.metadata.create_all(bind=db_engine)

# def _is_awaitable_close(obj: Any) -> bool:
#     # Chiudi in sicurezza solo se esiste un metodo close awaitable
#     close_fn = getattr(obj, "close", None)
#     return callable(close_fn) and asyncio.iscoroutinefunction(close_fn)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # =========================
    # STARTUP
    # =========================
    print("App startup")

    try:
        yield
    finally:
        # =========================
        # SHUTDOWN
        # =========================
        print("App shutdown")

        # --- Chiusura client async ---
        from config import weather_client, osm_client
        import asyncio

        def _is_awaitable_close(obj):
            close_fn = getattr(obj, "close", None)
            return callable(close_fn) and asyncio.iscoroutinefunction(close_fn)

app = FastAPI(
    title="Magazzino DM",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

origins = [
    "http://localhost:8080",
    "http://192.168.0.140:8080",  # il frontend in produzione
    "http://localhost:5173",      # per sviluppo vite
]

# CORS (collegamento con frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_request(request: Request, call_next):
    body = await request.body()
    # Non decodificare i file binari (PDF, immagini, ecc.)
    if request.headers.get("content-type", "").startswith("multipart/form-data"):
        print("RAW BODY: [Binary file upload - not decoded]")
    else:
        try:
            print("RAW BODY:", body.decode())
        except UnicodeDecodeError:
            print("RAW BODY: [Binary content - not decodable as UTF-8]")
    response = await call_next(request)
    return response

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print("❌ VALIDATION ERROR:")
    print(exc.errors())
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()}
    )


app.include_router(auth_router)
