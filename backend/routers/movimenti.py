import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from routers.auth import get_current_user
from schemas import MovimentoCreate, MovimentoResponse
from typing import List
from config import get_db_ricambi
from crud.crud_movimento import crea_movimento
from crud.crud_articolo import update_qta_articolo


logger = logging.getLogger("movimenti")

router = APIRouter(prefix="/movimenti", tags=["movimenti"])

@router.post("/", response_model=MovimentoResponse)
def aggiungi_movimento(movimento: MovimentoCreate, db: Session = Depends(get_db_ricambi)):
    """
    Crea un nuovo movimento e aggiorna la quantità dell'articolo.
    Le operazioni sono atomiche: se una fallisce, nessuna viene salvata.
    """
    # Aggiorna la quantità dell'articolo (senza commit)
    update_qta_articolo(db, movimento.idarticolo, movimento.qta)

    # Crea il movimento (senza commit)
    nuovo_movimento = crea_movimento(db, movimento)

    # Commit unico per entrambe le operazioni (atomico)
    db.commit()
    db.refresh(nuovo_movimento)

    return nuovo_movimento