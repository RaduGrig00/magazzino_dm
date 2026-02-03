import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models import Articolo
from routers.auth import get_current_user
from schemas import MovimentoCreate, MovimentoResponse
from typing import List
from config import get_db_ricambi
from crud.crud_movimento import crea_movimento
from crud.crud_articolo import put_qta_articolo


logger = logging.getLogger("movimenti")

router = APIRouter(prefix="/movimenti", tags=["movimenti"])

@router.post("/", response_model=MovimentoResponse)
def aggiungi_movimento(movimento: MovimentoCreate, db: Session = Depends(get_db_ricambi)):
    # Aggiorna quantità
    put_qta_articolo(db, movimento.idarticolo, movimento.qta)
    
    # Crea movimento
    nuovo_movimento = crea_movimento(db, movimento)
    
    # Commit unico 
    db.commit()
    db.refresh(nuovo_movimento)
    
    return nuovo_movimento