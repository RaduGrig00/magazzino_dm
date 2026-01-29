from sqlalchemy import desc
from sqlalchemy.orm import Session
from models import Intervento

def get_interventi_asc_order(db: Session):
    interventi = db.query(Intervento).order_by(desc(Intervento.data_richiesta)).limit(25).all()
    
    return interventi