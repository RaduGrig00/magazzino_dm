export interface Articolo {
  id: number;
  codice: string;
  descrizione?: string;
  prezzo_acquisto?: number;
  prezzo_vendita?: number;
  marca?: string;
  categoria?: string;
  barcode?: string;
  note?: string;
  created_at?: string;
  updated_at?: string;
}