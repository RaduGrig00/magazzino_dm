from sqlalchemy import desc
from sqlalchemy.orm import Session, joinedload
from models import Intervento

def get_interventi_asc_order(db: Session):
    """Recupera gli ultimi 25 interventi con eager loading del cliente"""
    interventi = (
        db.query(Intervento)
        .options(joinedload(Intervento.cliente))
        .order_by(desc(Intervento.data_richiesta))
        .limit(25)
        .all()
    )

    return interventi