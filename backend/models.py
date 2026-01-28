from datetime import datetime
from sqlalchemy import Column, DateTime, Float, Integer, String, Text, func
from config import Base


class Articolo(Base):
    __tablename__ = "mg_articoli"

    id = Column(Integer, primary_key=True, index=True)
    codice = Column(String(50), unique=True, nullable=False, index=True)
    descrizione = Column(String(255))
    prezzo_acquisto = Column(Float)
    prezzo_vendita = Column(Float)
    barcode = Column(String(50))
    note = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True))


class Utente(Base):
    """Mappatura sulla tabella zz_users di OpenSTAManager."""
    __tablename__ = "zz_users"

    id = Column(Integer, primary_key=True)
    username = Column(String(255), unique=True, nullable=False)
    password = Column(String(255), nullable=False)    # hash bcrypt ($2y$)
    email = Column(String(255))
    enabled = Column(Integer, default=1)
    idanagrafica = Column(Integer)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
