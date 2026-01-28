from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import os

load_dotenv()

# ============================================================
# DB OSM (MySQL) – dataemme
# ============================================================
DB_OSM_NAME = os.getenv("DB_CHIAMATE_NAME")
DB_OSM_HOST = os.getenv("DB_CHIAMATE_HOST")
DB_OSM_PORT = os.getenv("DB_CHIAMATE_PORT", "3306")
DB_OSM_USER = os.getenv("DB_CHIAMATE_USER")
DB_OSM_PASSWORD = os.getenv("DB_CHIAMATE_PASSWORD")

DB_OSM_URL = (
    f"mysql+pymysql://{DB_OSM_USER}:"
    f"{DB_OSM_PASSWORD}@"
    f"{DB_OSM_HOST}:"
    f"{DB_OSM_PORT}/"
    f"{DB_OSM_NAME}"
)

osm_engine = create_engine(
    DB_OSM_URL,
    pool_pre_ping=True,
    pool_recycle=1800,
    pool_size=10,
    max_overflow=20,
)
OsmSession = sessionmaker(autocommit=False, autoflush=False, bind=osm_engine)
Base = declarative_base()


def get_db():
    """Sessione verso il DB OSM (dataemme)."""
    db = OsmSession()
    try:
        yield db
    finally:
        db.close()


# Alias
db_engine = osm_engine
get_db_ricambi = get_db

# ============================================================
# Client OSM (API REST)
# ============================================================
BASE_URL_OSM = os.getenv("BASE_URL_OSM")
TOKEN_ADMIN_OSM = os.getenv("TOKEN_ADMIN_OSM")

osm_client = None
weather_client = None
