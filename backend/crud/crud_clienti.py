from sqlalchemy.orm import Session
from models import Cliente


def get_cliente_by_id(db: Session, idanagrafica: int):
    cliente = db.query(Cliente).filter(Cliente.idanagrafica==idanagrafica).first()
    return cliente


    