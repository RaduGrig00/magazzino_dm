import re
import socket
from typing import List, Optional
from fastapi import Depends, APIRouter
from pydantic import BaseModel
from sqlalchemy.orm import Session
from models import Articolo
import os
from dotenv import load_dotenv
import logging
from config import get_db_ricambi

router = APIRouter(prefix="/stampa-etichette", tags=["stampa-etichette"])

# ... (setup del logger rimane uguale) ...
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
formatter = logging.Formatter("[%(levelname)s] %(asctime)s - %(message)s")
handler.setFormatter(formatter)
logger.addHandler(handler)

# --- 1. MODIFICA ENV ---
load_dotenv()

# Stampante 1: Rete (Zebra Ethernet)
PRINTER_IP = os.getenv("PRINTER_IP")
PRINTER_PORT = int(os.getenv("PRINTER_PORT", 9100))

# Stampante 2: Magazzino (PC Ponte)
# Assicurati di avere PRINTER_BRIDGE_IP nel tuo .env
PRINTER_BRIDGE_IP = os.getenv("PRINTER_BRIDGE_IP") 
PRINTER_BRIDGE_PORT = int(os.getenv("PRINTER_BRIDGE_PORT", 9100))

# --- 2. MODIFICA MODELLI ---
class RicambioDaStampare(BaseModel):
    codice: str
    quantita: int

class StampaEtichetteRequest(BaseModel):
    ricambi: List[RicambioDaStampare]
    stampante: str = "rete"  # Valori accettati: "rete", "magazzino"

class EtichettaLibera(BaseModel):
    descrizione: str
    quantita: int

class StampaEtichettaLibera(BaseModel):
    etichetta: EtichettaLibera
    stampante: str = "rete"

def generate_ricambio_zpl(codice: str, descrizione: str = "", marca: str = "", categoria: str = "", dpi: int = 203, quantita: int = 1, darkness: int = 25, speed: int = 5) -> str:
    dots_per_mm = dpi / 25.4
    label_width = int(100 * dots_per_mm)
    label_height = int(90 * dots_per_mm)
    
    desc_lines = []
    MAX_CHAR_PER_LINE = 22
    if descrizione:
        descrizione_processata = descrizione.replace('-', '- ')
        words = descrizione_processata.split()
        current_line = ""
        for word in words:
            while len(word) > MAX_CHAR_PER_LINE:
                if current_line: desc_lines.append(current_line); current_line = ""
                desc_lines.append(word[:MAX_CHAR_PER_LINE]); word = word[MAX_CHAR_PER_LINE:]
            test_line = (current_line + " " + word).strip() if current_line else word
            if len(test_line) <= MAX_CHAR_PER_LINE: current_line = test_line
            else:
                if current_line: desc_lines.append(current_line)
                current_line = word
        if current_line: desc_lines.append(current_line)
        desc_lines = desc_lines[:6]

    desc_zpl = ""
    y_pos = 40; font_size = 70; line_spacing = 65
    for line in desc_lines:
        desc_zpl += f"^CF0,{font_size}\n^FO0,{y_pos}^FB{label_width},1,0,C^FD{line}^FS\n"
        y_pos += line_spacing
    if not desc_zpl: desc_zpl = f"^CF0,{font_size}\n^FO0,40^FB{label_width},1,0,C^FDN/D^FS\n"
    codice_y_pos = label_height - 70
    return f"^XA\n^JUS\n^PW{label_width}\n^LL{label_height}\n\n^MD{darkness}\n^PR{speed}\n\n{desc_zpl}\n^CF0,80\n^FO0,{codice_y_pos}^FB{label_width},1,0,C^FD{codice}^FS\n\n^PQ{quantita}\n^XZ"

def generate_etichetta_libera_zpl(descrizione: str = "", dpi: int = 203, quantita: int = 1, darkness: int = 25, speed: int = 5) -> str:
    dots_per_mm = dpi / 25.4
    label_width = int(100 * dots_per_mm)
    label_height = int(90 * dots_per_mm)
    
    desc_lines = []
    MAX_CHAR_PER_LINE = 22
    if descrizione:
        descrizione_processata = descrizione.replace('-', '- ')
        words = descrizione_processata.split()
        current_line = ""
        for word in words:
            while len(word) > MAX_CHAR_PER_LINE:
                if current_line: desc_lines.append(current_line); current_line = ""
                desc_lines.append(word[:MAX_CHAR_PER_LINE]); word = word[MAX_CHAR_PER_LINE:]
            test_line = (current_line + " " + word).strip() if current_line else word
            if len(test_line) <= MAX_CHAR_PER_LINE: current_line = test_line
            else:
                if current_line: desc_lines.append(current_line)
                current_line = word
        if current_line: desc_lines.append(current_line)
        desc_lines = desc_lines[:8]

    desc_zpl = ""
    y_pos = 40; font_size = 70; line_spacing = 65
    for line in desc_lines:
        desc_zpl += f"^CF0,{font_size}\n^FO0,{y_pos}^FB{label_width},1,0,C^FD{line}^FS\n"
        y_pos += line_spacing
    if not desc_zpl: desc_zpl = f"^CF0,{font_size}\n^FO0,40^FB{label_width},1,0,C^FDN/D^FS\n"
    return f"^XA\n^JUS\n^PW{label_width}\n^LL{label_height}\n\n^MD{darkness}\n^PR{speed}\n\n{desc_zpl}\n^CF0,80\n\n^PQ{quantita}\n^XZ"

# --- 3. MODIFICA FUNZIONE INVIO ---
def send_to_zebra(zpl_code: str, ip: str, port: int):
    """Invia ZPL a un IP specifico"""
    if not ip:
        raise ValueError("IP stampante non configurato")
        
    try:    
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(5)
            logger.info(f"Tento connessione a stampante: {ip}:{port}")
            s.connect((ip, port))
            s.sendall(zpl_code.encode())
            logger.info("Etichetta inviata con successo.")
    except Exception as e:
        logger.error(f"Errore invio a {ip}: {e}")
        raise ConnectionError(f"Errore connessione stampante {ip}: {e}")


@router.post("/")
async def stampa_etichette(req: StampaEtichetteRequest, db: Session = Depends(get_db_ricambi)):
    """Stampa etichette ricambi"""
    logger.info(f"Stampa {len(req.ricambi)} ricambi su stampante: {req.stampante}")
    
    # === CONFIGURAZIONE DINAMICA ===
    if req.stampante == "magazzino":
        # Impostazioni PONTE/MAGAZZINO
        target_ip = PRINTER_BRIDGE_IP
        target_port = PRINTER_BRIDGE_PORT
        
        # Scurezza 15, Velocità 2 (come richiesto)
        settings_darkness = 15 
        settings_speed = 2     
        
        if not target_ip:
            return {"errori": [{"codice": "SYS", "errore": "IP Magazzino non configurato nel server"}]}
            
    else:
        # Impostazioni RETE (Default)
        target_ip = PRINTER_IP
        target_port = PRINTER_PORT
        
        # Scurezza 25, Velocità 5 (impostazioni attuali)
        settings_darkness = 25 
        settings_speed = 5

    processed = []
    errors = []
    
    for r in req.ricambi:
        try:
            articolo = db.query(Articolo).filter(Articolo.codice == r.codice).first()
            
            if not articolo:
                errors.append({"codice": r.codice, "errore": "Articolo non trovato"})
                continue
            
            # Passiamo i parametri configurati alla funzione ZPL
            zpl_content = generate_ricambio_zpl(
                codice=articolo.codice,
                descrizione=articolo.descrizione or "",
                quantita=r.quantita,
                darkness=settings_darkness, 
                speed=settings_speed 
            )
            
            send_to_zebra(zpl_content, target_ip, target_port)
            
            processed.append({
                "codice": r.codice,
                "descrizione": articolo.descrizione,
                "fonte": "database",
                "stampante": req.stampante
            })
            logger.info(f"✅ {r.codice} inviato a {req.stampante} (MD{settings_darkness}/PR{settings_speed})")
            
        except Exception as e:
            logger.error(f"❌ {r.codice}: {e}")
            errors.append({"codice": r.codice, "errore": str(e)})
    
    return {
        "stampati": processed,
        "errori": errors,
        "totale_successo": len(processed),
        "totale_errori": len(errors)
    }

@router.post("/etichetta-libera")
async def stampa_etichetta_libera(req: EtichettaLibera, stampante: str = "rete"):
    """Stampa etichette libera"""
    logger.info(f"Stampa {req.descrizione} su stampante: {stampante}")
    
    # === CONFIGURAZIONE DINAMICA ===
    if stampante == "magazzino":
        # Impostazioni PONTE/MAGAZZINO
        target_ip = PRINTER_BRIDGE_IP
        target_port = PRINTER_BRIDGE_PORT
        
        # Scurezza 15, Velocità 2 (come richiesto)
        settings_darkness = 15 
        settings_speed = 2     
        
        if not target_ip:
            return {"errori": [{"codice": "SYS", "errore": "IP Magazzino non configurato nel server"}]}
            
    else:
        # Impostazioni RETE (Default)
        target_ip = PRINTER_IP
        target_port = PRINTER_PORT
        
        # Scurezza 25, Velocità 5 (impostazioni attuali)
        settings_darkness = 25 
        settings_speed = 5

    processed = []
    errors = []

    try:
        # Passiamo i parametri configurati alla funzione ZPL
        zpl_content = generate_etichetta_libera_zpl(
            descrizione=req.descrizione or "",
            quantita=req.quantita,
            darkness=settings_darkness, 
            speed=settings_speed 
        )
            
        send_to_zebra(zpl_content, target_ip, target_port)
            
        processed.append({
            "descrizione": req.descrizione,
            "fonte": "input",
            "stampante": stampante
        })
        logger.info(f"Etichetta inviata a {stampante} (MD{settings_darkness}/PR{settings_speed})")
            
    except Exception as e:
        logger.error(f"{req.descrizione}: {e}")
        errors.append({"Desc": req.descrizione, "errore": str(e)})
    
    return {
        "stampati": processed,
        "errori": errors,
        "totale_successo": len(processed),
        "totale_errori": len(errors)
    }