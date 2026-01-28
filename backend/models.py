from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, ForeignKey, Date, Text, UniqueConstraint, func
from sqlalchemy.orm import relationship
from config import Base
import uuid

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
