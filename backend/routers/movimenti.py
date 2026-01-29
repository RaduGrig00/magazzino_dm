import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from routers.auth import get_current_user
from schemas import MovimentoCreate, MovimentoResponse
from typing import List
from config import get_db_ricambi
from crud.crud_movimento import crea_movimento


logger = logging.getLogger("movimenti")

router = APIRouter(prefix="/movimenti", tags=["movimenti"])

@router.post("/", response_model=MovimentoResponse)
def aggiungi_movimento(movimento: MovimentoCreate, db: Session = Depends(get_db_ricambi)):
    return crea_movimento(db, movimento)