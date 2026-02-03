from http.client import HTTPException
from sqlalchemy.orm import Session
from schemas import ArticoloUpdate
from models import Articolo


def get_articolo_by_barcode(db: Session, barcode: str):
    query = db.query(Articolo).filter(Articolo.codice==barcode).first()
    return query

def put_qta_articolo(db: Session, id: int, qta: int):
    articolo_da_aggiornare = db.query(Articolo).filter(Articolo.id == id).first()
    
    if not articolo_da_aggiornare:
        raise HTTPException(status_code=404, detail="Articolo non trovato")
    
    nuova_qta = articolo_da_aggiornare.qta + qta
    if nuova_qta < 0:
        raise HTTPException(status_code=400, detail="La quantità non può essere negativa")
    
    articolo_da_aggiornare.qta = nuova_qta
    
    return articolo_da_aggiornare
    