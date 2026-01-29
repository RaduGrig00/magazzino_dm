from sqlalchemy.orm import Session
from models import Articolo


def get_articolo_by_barcode(db: Session, barcode: str):
    query = db.query(Articolo).filter(Articolo.codice==barcode).first()
    return query


    