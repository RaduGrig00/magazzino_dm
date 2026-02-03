from sqlalchemy.orm import Session
from fastapi import HTTPException
from models import Articolo


def get_articolo_by_barcode(db: Session, barcode: str):
    query = db.query(Articolo).filter(Articolo.codice==barcode).first()
    return query


def update_qta_articolo(db: Session, idarticolo: int, qta):
    """
    Aggiorna la quantità di un articolo (senza commit).
    Il commit deve essere gestito dal chiamante per garantire atomicità.
    """
    articolo = db.query(Articolo).filter(Articolo.id == idarticolo).first()

    if not articolo:
        raise HTTPException(status_code=404, detail="Articolo non trovato")

    nuova_qta = articolo.qta + qta
    if nuova_qta < 0:
        raise HTTPException(status_code=400, detail="La quantità non può essere negativa")

    articolo.qta = nuova_qta
    return articolo
