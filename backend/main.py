from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from routers.auth import router as auth_router
from routers.articoli import router as articoli_router
from routers.movimenti import router as movimenti_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("App startup")
    try:
        yield
    finally:
        print("App shutdown")


app = FastAPI(
    title="Magazzino DM",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

origins = [
    "http://localhost:8080",
    "http://192.168.0.140:8080",
    "http://localhost:5173",
]

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
    print("VALIDATION ERROR:")
    print(exc.errors())
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )


app.include_router(auth_router)
app.include_router(articoli_router)
app.include_router(movimenti_router)
