from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import os
from typing import Optional
#from osm_client import OSMClient 

load_dotenv()

# ==== DB OSM ====
DB_CHIAMATE_NAME = os.getenv("DB_CHIAMATE_NAME")
DB_CHIAMATE_HOST = os.getenv("DB_CHIAMATE_HOST")
DB_CHIAMATE_PORT = os.getenv("DB_CHIAMATE_PORT", "3306")
DB_CHIAMATE_USER = os.getenv("DB_CHIAMATE_USER")
DB_CHIAMATE_PASSWORD = os.getenv("DB_CHIAMATE_PASSWORD")

DB_RICAMBI_URL = (
    f"mysql+pymysql://{DB_CHIAMATE_USER}:"
    f"{DB_CHIAMATE_PASSWORD}@"
    f"{DB_CHIAMATE_HOST}:"
    f"{DB_CHIAMATE_PORT}/"
    f"{DB_CHIAMATE_NAME}"
)

ricambi_engine = create_engine(
    DB_RICAMBI_URL,
    pool_pre_ping=True,      # 👈 verifica connessione prima di usarla
    pool_recycle=1800,       # 👈 ricrea connessioni > 30 min
    pool_size=10,
    max_overflow=20,
)
ricambi_session = sessionmaker(autocommit=False, autoflush=False, bind=ricambi_engine)
BaseRicambi = declarative_base()

def get_db_ricambi():
    """Database ricambi (articoli Konica)"""
    db = ricambi_session()
    try:
        yield db
    finally:
        db.close()

# ==== OSM ====
#BASE_URL_OSM = os.getenv("BASE_URL_OSM")
#TOKEN_ADMIN_OSM = os.getenv("TOKEN_ADMIN_OSM")
#osm_client = OSMClient(base_url=BASE_URL_OSM, token=TOKEN_ADMIN_OSM)
