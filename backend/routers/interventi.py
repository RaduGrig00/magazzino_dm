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
    """GET degli ultimi 25 interventi con ragione_sociale del cliente"""
    interventi = get_interventi_asc_order(db=db)

    if not interventi:
        raise HTTPException(status_code=404, detail="Nessun intervento trovato")

    # Costruisco la response includendo ragione_sociale dal cliente
    result = []
    for intervento in interventi:
        intervento_dict = {
            "id": intervento.id,
            "codice": intervento.codice,
            "data_richiesta": intervento.data_richiesta,
            "richiesta": intervento.richiesta,
            "descrizione": intervento.descrizione,
            "km": intervento.km,
            "idtipointervento": intervento.idtipointervento,
            "nomefile": intervento.nomefile,
            "idanagrafica": intervento.idanagrafica,
            "idreferente": intervento.idreferente,
            "idagente": intervento.idagente,
            "idstatointervento": intervento.idstatointervento,
            "informazioniaggiuntive": intervento.informazioniaggiuntive,
            "prezzo_ore_unitario": intervento.prezzo_ore_unitario,
            "idsede_partenza": intervento.idsede_partenza,
            "idsede_destinazione": intervento.idsede_destinazione,
            "idclientefinale": intervento.idclientefinale,
            "info_sede": intervento.info_sede,
            "firma_file": intervento.firma_file,
            "firma_data": intervento.firma_data,
            "firma_nome": intervento.firma_nome,
            "data_invio": intervento.data_invio,
            "data_scadenza": intervento.data_scadenza,
            "codice_cig": intervento.codice_cig,
            "codice_cup": intervento.codice_cup,
            "id_documento_fe": intervento.id_documento_fe,
            "num_item": intervento.num_item,
            "id_preventivo": intervento.id_preventivo,
            "id_contratto": intervento.id_contratto,
            "id_ordine": intervento.id_ordine,
            "numfatturazione": intervento.numfatturazione,
            "id_segment": intervento.id_segment,
            "created_at": intervento.created_at,
            "updated_at": intervento.updated_at,
            "deleted_at": intervento.deleted_at,
            "ragione_sociale": intervento.cliente.ragione_sociale if intervento.cliente else None,
        }
        result.append(intervento_dict)

    return result

    