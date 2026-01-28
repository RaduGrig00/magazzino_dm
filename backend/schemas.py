from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_serializer, field_validator, validator
from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

class ArticoloCreate(BaseModel):
    codice: str
    descrizione: Optional[str] = None
    prezzo_acquisto: Optional[float] = None
    prezzo_vendita: Optional[float] = None
    barcode: Optional[str] = None
    note: Optional[str] = None

class ArticoloUpdate(BaseModel):
    descrizione: Optional[str] = None
    prezzo_acquisto: Optional[float] = None
    prezzo_vendita: Optional[float] = None
    barcode: Optional[str] = None
    note: Optional[str] = None

class ArticoloResponse(BaseModel):
    id: int
    codice: str
    descrizione: Optional[str]
    prezzo_acquisto: Optional[float]
    prezzo_vendita: Optional[float]
    barcode: Optional[str]
    note: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class UtenteResponse(BaseModel):
    id: int
    username: str
    email: Optional[str]
    enabled: Optional[int]

    class Config:
        from_attributes = True