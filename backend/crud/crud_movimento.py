from sqlalchemy.orm import Session
from schemas import MovimentoCreate
from models import Movimento


def crea_movimento(db: Session, movimento: MovimentoCreate):
    """
    Crea un nuovo movimento (senza commit).
    Il commit deve essere gestito dal chiamante per garantire atomicità.
    """
    db_movimento = Movimento(
        idarticolo = movimento.idarticolo,
        qta = movimento.qta,
        movimento = movimento.movimento,
        data = movimento.data,
        manuale = movimento.manuale,
        idintervento = movimento.idintervento,
        idddt = movimento.idddt,
        iddocumento = movimento.iddocumento,
        idsede = movimento.idsede,
        reference_id = movimento.reference_id,
        reference_type = movimento.reference_type,
        idutente = movimento.idutente
    )

    db.add(db_movimento)
    return db_movimento