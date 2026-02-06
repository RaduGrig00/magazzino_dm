export interface Articolo {
  id: number;
  codice: string;
  descrizione?: string;
  qta: number;
  threshold_qta: number;
  prezzo_acquisto?: number;
  prezzo_vendita?: number;
  ubicazione?: string;
  marca?: string;
  categoria?: string;
  barcode?: string;
  note?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Intervento {
  id: number;
  codice: string;
  data_richiesta?: string;
  richiesta?: string;
  descrizione?: string;
  idanagrafica: number;
  ragione_sociale?: string;
}