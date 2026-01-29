import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from schemas import ClienteResponse
from config import get_db_ricambi
from crud.crud_clienti import get_cliente_by_id

logger = logging.getLogger("clienti")

router = APIRouter(prefix="/clienti", tags=["clienti"])

@router.get("/{idanagrafica}", response_model=ClienteResponse)
def read_cliente_by_id(idanagrafica: int, db: Session = Depends(get_db_ricambi)):
    """GET di un cliente tramite idanagrafica"""
    cliente = get_cliente_by_id(idanagrafica=idanagrafica, db=db)

    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    return cliente

    