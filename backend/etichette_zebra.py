import re
import socket
from typing import List
from fastapi import Depends, APIRouter
from pydantic import BaseModel
from requests import request
from sqlalchemy.orm import Session
from models import Articolo, Cliente
import os
from dotenv import load_dotenv
import datetime
import logging
from config import get_db_ricambi

router = APIRouter(prefix="/stampa-etichette", tags=["stampa-etichette"])

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

handler = logging.StreamHandler()
formatter = logging.Formatter("[%(levelname)s] %(asctime)s - %(message)s")
handler.setFormatter(formatter)
logger.addHandler(handler)

class RicambioDaStampare(BaseModel):
    codice: str
    quantita: int

class StampaEtichetteRequest(BaseModel):
    ricambi: List[RicambioDaStampare]

load_dotenv()

PRINTER_IP=os.getenv("PRINTER_IP")
PRINTER_PORT=int(os.getenv("PRINTER_PORT"))


def generate_ricambio_zpl(
    codice: str,
    descrizione: str = "",
    marca: str = "",
    categoria: str = "",
    dpi: int = 203,
    quantita: int = 1
) -> str:
    """
    Genera ZPL per etichetta ricambio - solo descrizione e codice.
    Layout simile alle etichette consumabili.
    """
    # Calcolo dimensioni (stesse dei consumabili)
    dots_per_mm = dpi / 25.4
    label_width = int(100 * dots_per_mm)  # 100mm
    label_height = int(90 * dots_per_mm)  # 90mm (come consumabili)

    # Gestione descrizione multi-riga (max 3 righe)
    desc_lines = []
    if descrizione:
        # Dividi in righe da max 25 caratteri
        words = descrizione.split()
        current_line = ""
        for word in words:
            if len(current_line + " " + word) <= 25:
                current_line = (current_line + " " + word).strip()
            else:
                if current_line:
                    desc_lines.append(current_line)
                current_line = word
        if current_line:
            desc_lines.append(current_line)
        desc_lines = desc_lines[:3]  # Max 3 righe

    # Costruisci ZPL per descrizione
    desc_zpl = ""
    y_pos = 80
    for line in desc_lines:
        desc_zpl += f"^CF0,70\n^FO0,{y_pos}^FB{label_width},1,0,C^FD{line}^FS\n"
        y_pos += 80

    # Se nessuna descrizione
    if not desc_zpl:
        desc_zpl = f"^CF0,70\n^FO0,80^FB{label_width},1,0,C^FDN/D^FS\n"

    return f"""^XA
^JUS
^PW{label_width}
^LL{label_height}

^MD25
^PR5

{desc_zpl}
^CF0,80
^FO0,{label_height - 150}^FB{label_width},1,0,C^FD{codice}^FS

^PQ{quantita}
^XZ"""


def send_to_zebra(zpl_code: str):
    """Invia il codice ZPL alla stampante zebra"""
    try:    
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(5)  # evita blocchi infiniti
            logger.info(f"Tento connessione a stampante: {PRINTER_IP}:{PRINTER_PORT}")
            s.connect((PRINTER_IP, PRINTER_PORT))
            s.sendall(zpl_code.encode())
            logger.info("Etichetta inviata con successo.")
    except Exception as e:
        logger.error(f"Errore durante l'invio alla stampante: {e}")
        raise ConnectionError(f"Errore durante l'invio alla stampante: {e}")



@router.post("/stampa-etichette")
async def stampa_etichette(etichetta: StampaEtichetteRequest, db: Session = Depends(get_db_ricambi)):
    """Stampa etichette ricambi da database"""
    logger.info(f"Stampa di {len(etichetta.ricambi)} ricambi")
    
    processed = []
    errors = []
    
    for r in etichetta.ricambi:
        try:
            articolo = db.query(Articolo).filter(Articolo.codice == r.codice).first()
            
            if not articolo:
                logger.warning(f"⚠️ {r.codice} non trovato")
                errors.append({
                    "codice": r.codice, 
                    "errore": "Articolo non trovato"
                })
                continue
            
            zpl_content = generate_ricambio_zpl(
                codice=articolo.codice,
                descrizione=articolo.descrizione or "",
                quantita=r.quantita
            )
            
            send_to_zebra(zpl_content)
            
            processed.append({
                "codice": r.codice,
                "descrizione": articolo.descrizione,
                "fonte": "database"
            })
            logger.info(f"✅ {r.codice}")
            
        except Exception as e:
            logger.error(f"❌ {r.codice}: {e}")
            errors.append({"codice": r.codice, "errore": str(e)})
    
    return {
        "stampati": processed,
        "errori": errors,
        "totale_successo": len(processed),
        "totale_errori": len(errors)
    }