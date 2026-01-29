import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from routers.auth import get_current_user
from schemas import ArticoloResponse, ArticoloUpdate
from typing import List
from config import get_db_ricambi
from crud.crud_articolo import get_articolo_by_barcode

logger = logging.getLogger("articoli")

router = APIRouter(prefix="/articoli", tags=["articoli"])

@router.get("/{barcode}", response_model=ArticoloResponse)
def read_articolo_by_barcode(barcode: str, db: Session = Depends(get_db_ricambi), current_user: dict = Depends(get_current_user)):
    """GET di uno specifico articolo tramite barcode"""
    articolo = get_articolo_by_barcode(barcode=barcode, db=db)

    if not articolo:
        raise HTTPException(status_code=404, detail="Articolo non trovato")
    
    return articolo

    