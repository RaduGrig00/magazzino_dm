from decimal import Decimal
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

class MovimentoCreate(BaseModel):
    idarticolo: int
    qta: Decimal
    movimento: str
    data: Optional[date] = None
    manuale: bool = False
    idintervento: Optional[int] = None
    idddt: int
    iddocumento: int
    idsede: int
    reference_id: Optional[int] = None
    reference_type: Optional[str] = None
    idutente: Optional[int] = None

class MovimentoUpdate(BaseModel):
    qta: Optional[Decimal] = None
    movimento: Optional[str] = None
    data: Optional[date] = None
    manuale: Optional[bool] = None
    idintervento: Optional[int] = None
    idddt: Optional[int] = None
    iddocumento: Optional[int] = None
    idsede: Optional[int] = None
    reference_id: Optional[int] = None
    reference_type: Optional[str] = None
    idutente: Optional[int] = None

class MovimentoResponse(BaseModel):
    id: int
    idarticolo: int
    qta: Decimal
    movimento: str
    data: Optional[date]
    manuale: bool
    idintervento: Optional[int]
    idddt: int
    iddocumento: int
    idsede: int
    reference_id: Optional[int]
    reference_type: Optional[str]
    idutente: Optional[int]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
