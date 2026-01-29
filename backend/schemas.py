from decimal import Decimal
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_serializer, field_validator, validator
from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

class ArticoloCreate(BaseModel):
    codice: str
    descrizione: Optional[str] = None
    qta: Optional[Decimal] = None
    threshold_qta: Optional[Decimal] = None
    prezzo_acquisto: Optional[float] = None
    prezzo_vendita: Optional[float] = None
    barcode: Optional[str] = None
    note: Optional[str] = None

class ArticoloUpdate(BaseModel):
    descrizione: Optional[str] = None
    qta: Optional[Decimal] = None
    threshold_qta: Optional[Decimal] = None
    prezzo_acquisto: Optional[float] = None
    prezzo_vendita: Optional[float] = None
    barcode: Optional[str] = None
    note: Optional[str] = None

class ArticoloResponse(BaseModel):
    id: int
    codice: str
    descrizione: Optional[str]
    qta: Optional[Decimal] = None
    threshold_qta: Optional[Decimal] = None
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


class InterventoResponse(BaseModel):
    id: int
    codice: str

    data_richiesta: Optional[datetime]
    richiesta: Optional[str]
    descrizione: Optional[str]

    km: Decimal

    idtipointervento: int
    nomefile: str
    idanagrafica: int
    idreferente: int
    idagente: int
    idstatointervento: int

    informazioniaggiuntive: Optional[str]

    prezzo_ore_unitario: Decimal

    idsede_partenza: int
    idsede_destinazione: int
    idclientefinale: int

    info_sede: str

    firma_file: str
    firma_data: Optional[datetime]
    firma_nome: str

    data_invio: Optional[datetime]
    data_scadenza: Optional[datetime]

    codice_cig: Optional[str]
    codice_cup: Optional[str]
    id_documento_fe: Optional[str]
    num_item: Optional[str]

    id_preventivo: Optional[int]
    id_contratto: Optional[int]
    id_ordine: Optional[int]

    numfatturazione: Optional[str]
    id_segment: int

    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    deleted_at: Optional[datetime]

    # Ragione sociale del cliente (from join)
    ragione_sociale: Optional[str] = None

    class Config:
        from_attributes = True

class ClienteResponse(BaseModel):
    idanagrafica: int
    ragione_sociale: str

    class Config:
        from_attributes = True