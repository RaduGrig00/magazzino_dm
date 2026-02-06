from sqlalchemy import TIMESTAMP, Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, Numeric, String, Text, func, text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from config import Base


class Articolo(Base):
    __tablename__ = "mg_articoli"

    id = Column(Integer, primary_key=True, index=True)
    codice = Column(String(50), unique=True, nullable=False, index=True)
    descrizione = Column(String(255))
    qta = Column(Numeric(15, 6), nullable=False)
    threshold_qta = Column(Numeric(15, 6), nullable=False)
    prezzo_acquisto = Column(Float)
    prezzo_vendita = Column(Float)
    ubicazione = Column(String)
    barcode = Column(String(50))
    note = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True))
    movimenti = relationship(
        "Movimento",
        back_populates="articolo",
        cascade="all, delete-orphan"
    )

class Movimento(Base):
    __tablename__ = "mg_movimenti"

    id = Column(Integer, primary_key=True, index=True)
    idarticolo = Column(Integer, ForeignKey("mg_articoli.id", ondelete="CASCADE"), nullable=False)
    qta = Column(Numeric(15, 6), nullable=False)
    movimento = Column(String(255), nullable=False)
    data = Column(Date, nullable=True)
    manuale = Column(Boolean, nullable=False, default=False)
    idintervento = Column(Integer, ForeignKey("in_interventi.id", ondelete="CASCADE"), nullable=False)
    idddt = Column(Integer, nullable=False) #da prendere probabilmente tramite api su osm
    iddocumento = Column(Integer, nullable=False)
    idsede = Column(Integer, nullable=False)
    created_at = Column(
        TIMESTAMP,
        nullable=True,
        server_default=text("CURRENT_TIMESTAMP")
    )
    updated_at = Column(
        TIMESTAMP,
        nullable=True,
        server_default=text("CURRENT_TIMESTAMP"),
        onupdate=func.current_timestamp()
    )
    reference_id = Column(Integer, nullable=True)
    reference_type = Column(String(255), nullable=True)
    idutente = Column(Integer, nullable=True)
    articolo = relationship("Articolo", back_populates="movimenti")
    intervento = relationship("Intervento", back_populates="movimenti")


class Intervento(Base):
    __tablename__ = "in_interventi"

    id = Column(Integer, primary_key=True, index=True)
    codice = Column(String(25), nullable=False)
    data_richiesta = Column(DateTime, nullable=True)
    richiesta = Column(Text, nullable=True)
    descrizione = Column(Text, nullable=True)
    km = Column(Numeric(7, 2), nullable=False)
    idtipointervento = Column(Integer, nullable=False, index=True)
    nomefile = Column(String(255), nullable=False)
    idanagrafica = Column(Integer, ForeignKey("an_anagrafiche.idanagrafica", ondelete="CASCADE"), nullable=False, index=True)
    idreferente = Column(Integer, nullable=False)
    idagente = Column(Integer, nullable=False)
    idstatointervento = Column(Integer, nullable=False, index=True)
    informazioniaggiuntive = Column(Text, nullable=True)
    prezzo_ore_unitario = Column(Numeric(15, 2), nullable=False)
    idsede_partenza = Column(Integer, nullable=False)
    idsede_destinazione = Column(Integer, nullable=False)
    idclientefinale = Column(Integer, nullable=False)
    info_sede = Column(String(255), nullable=False)
    firma_file = Column(String(255), nullable=False)
    firma_data = Column(DateTime, nullable=True)
    firma_nome = Column(String(255), nullable=False)
    data_invio = Column(DateTime, nullable=True)
    data_scadenza = Column(DateTime, nullable=True)
    created_at = Column(
        TIMESTAMP,
        nullable=True,
        server_default=text("CURRENT_TIMESTAMP")
    )
    updated_at = Column(
        TIMESTAMP,
        nullable=True,
        server_default=text("CURRENT_TIMESTAMP"),
        onupdate=func.current_timestamp()
    )
    codice_cig = Column(String(15), nullable=True)
    codice_cup = Column(String(15), nullable=True)
    id_documento_fe = Column(String(20), nullable=True)
    num_item = Column(String(15), nullable=True)
    deleted_at = Column(TIMESTAMP, nullable=True)
    id_preventivo = Column(Integer, nullable=True, index=True)
    id_contratto = Column(Integer, nullable=True, index=True)
    id_ordine = Column(Integer, nullable=True, index=True)
    numfatturazione = Column(Text, nullable=True)
    id_segment = Column(Integer, nullable=False)
    movimenti = relationship(
        "Movimento",
        back_populates="intervento",
        cascade="all, delete-orphan"
    )
    cliente = relationship("Cliente", back_populates="interventi")


class Cliente(Base):
    __tablename__ ="an_anagrafiche"

    idanagrafica = Column(Integer, primary_key=True, index=True)
    ragione_sociale = Column(String(255), nullable=False)

    interventi = relationship("Intervento", back_populates="cliente", cascade="all, delete-orphan")


class Utente(Base):
    """Mappatura sulla tabella zz_users di OpenSTAManager."""
    __tablename__ = "zz_users"

    id = Column(Integer, primary_key=True)
    username = Column(String(255), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    email = Column(String(255))
    enabled = Column(Integer, default=1)
    idanagrafica = Column(Integer)
