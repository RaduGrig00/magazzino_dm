import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from schemas import InterventoResponse
from typing import List
from config import get_db_ricambi
from crud.crud_interventi import get_interventi_asc_order

logger = logging.getLogger("interventi")

router = APIRouter(prefix="/interventi", tags=["interventi"])

@router.get("/", response_model=List[InterventoResponse])
def get_ultimi_interventi(db: Session = Depends(get_db_ricambi)):
    """GET degli ultimi 25 interventi"""
    interventi = get_interventi_asc_order(db=db)

    if not interventi:
        raise HTTPException(status_code=404, detail="Nessun intervento trovato")
    
    return interventi

    