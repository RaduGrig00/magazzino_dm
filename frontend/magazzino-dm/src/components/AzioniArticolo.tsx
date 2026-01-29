import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { apiFetch } from "../utils/auth";
import type { Articolo } from "../../types/types";

// === TYPES ===
type TipoAzione = "carico" | "scarico" | "intervento";

interface AzioniArticoloProps {
  articolo: Articolo;
  onMovimentoCreato?: () => void;
}

interface Messaggio {
  tipo: "success" | "error";
  testo: string;
}

interface MovimentoPayload {
  idarticolo: number;
  qta: number;
  movimento: string;
  data: string;
  manuale: boolean;
  idintervento: number | null;
  idddt: number;
  iddocumento: number;
  idsede: number;
  reference_id: number | null;
  reference_type: string | null;
  idutente: number | null;
}

// === CONSTANTS ===
const AZIONI_CONFIG: Record<Exclude<TipoAzione, "intervento">, { label: string; movimento: string }> = {
  carico: { label: "Carica", movimento: "Carico Manuale" },
  scarico: { label: "Scarica", movimento: "Scarico Manuale" },
};

const QTA_MIN = 0.001;
const QTA_MAX = 99999;

// === VALIDATION ===
const validateQuantita = (value: string): { valid: boolean; error?: string; parsed?: number } => {
  const trimmed = value.trim();

  if (!trimmed) {
    return { valid: false, error: "Inserisci una quantità" };
  }

  const parsed = parseFloat(trimmed.replace(",", "."));

  if (isNaN(parsed)) {
    return { valid: false, error: "Inserisci un numero valido" };
  }

  if (parsed < QTA_MIN) {
    return { valid: false, error: `La quantità deve essere almeno ${QTA_MIN}` };
  }

  if (parsed > QTA_MAX) {
    return { valid: false, error: `La quantità non può superare ${QTA_MAX}` };
  }

  return { valid: true, parsed };
};

const buildPayload = (
  articoloId: number,
  qta: number,
  tipoMovimento: string,
  isCarico: boolean
): MovimentoPayload => {
  const oggi = new Date().toISOString().split("T")[0];
  const qtaFinale = isCarico ? Math.abs(qta) : -Math.abs(qta);

  return {
    idarticolo: articoloId,
    qta: qtaFinale,
    movimento: tipoMovimento,
    data: oggi,
    manuale: true,
    idintervento: null,
    idddt: 0,
    iddocumento: 0,
    idsede: 0,
    reference_id: null,
    reference_type: null,
    idutente: null,
  };
};

// === COMPONENT ===
export default function AzioniArticolo({ articolo, onMovimentoCreato }: AzioniArticoloProps) {
  const [azioneSelezionata, setAzioneSelezionata] = useState<TipoAzione | null>(null);
  const [quantita, setQuantita] = useState("1");
  const [erroreQuantita, setErroreQuantita] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [messaggio, setMessaggio] = useState<Messaggio | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Focus input quando si seleziona un'azione
  useEffect(() => {
    if (azioneSelezionata && azioneSelezionata !== "intervento") {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [azioneSelezionata]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const resetForm = useCallback(() => {
    setAzioneSelezionata(null);
    setQuantita("1");
    setErroreQuantita(null);
    setMessaggio(null);
  }, []);

  const handleSelectAzione = useCallback((azione: TipoAzione) => {
    if (azione === "intervento") {
      setMessaggio({ tipo: "error", testo: "Funzionalità in sviluppo" });
      return;
    }
    setMessaggio(null);
    setErroreQuantita(null);
    setAzioneSelezionata(azione);
  }, []);

  const handleQuantitaChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Permetti solo numeri, punto e virgola
    if (value === "" || /^[\d.,]*$/.test(value)) {
      setQuantita(value);
      setErroreQuantita(null);
    }
  }, []);

  const handleConferma = useCallback(async () => {
    if (!azioneSelezionata || azioneSelezionata === "intervento") return;

    // Validazione quantità
    const validation = validateQuantita(quantita);
    if (!validation.valid || validation.parsed === undefined) {
      setErroreQuantita(validation.error ?? "Errore di validazione");
      inputRef.current?.focus();
      return;
    }

    // Validazione articolo
    if (!articolo?.id || typeof articolo.id !== "number") {
      setMessaggio({ tipo: "error", testo: "ID articolo non valido" });
      return;
    }

    const config = AZIONI_CONFIG[azioneSelezionata];
    const isCarico = azioneSelezionata === "carico";
    const payload = buildPayload(articolo.id, validation.parsed, config.movimento, isCarico);

    setIsLoading(true);
    setMessaggio(null);

    // Abort previous request if any
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      const res = await apiFetch("/movimenti/", {
        method: "POST",
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Errore ${res.status}: ${res.statusText}`);
      }

      const qtaLabel = validation.parsed === 1 ? "unità" : "unità";
      setMessaggio({
        tipo: "success",
        testo: `${config.movimento} di ${validation.parsed} ${qtaLabel} eseguito con successo`,
      });
      setAzioneSelezionata(null);
      setQuantita("1");
      onMovimentoCreato?.();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return; // Request was aborted, ignore
      }
      setMessaggio({
        tipo: "error",
        testo: err instanceof Error ? err.message : "Errore di connessione al server",
      });
    } finally {
      setIsLoading(false);
    }
  }, [azioneSelezionata, quantita, articolo, onMovimentoCreato]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleConferma();
      } else if (e.key === "Escape") {
        resetForm();
      }
    },
    [handleConferma, resetForm]
  );

  // Render form quantità
  const renderFormQuantita = () => {
    if (!azioneSelezionata || azioneSelezionata === "intervento") return null;

    const config = AZIONI_CONFIG[azioneSelezionata];

    return (
      <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-3 animate-fade-in">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{config.label} articolo</span>
          <button
            type="button"
            onClick={resetForm}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm"
            aria-label="Annulla"
          >
            Annulla
          </button>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={quantita}
              onChange={handleQuantitaChange}
              onKeyDown={handleKeyDown}
              placeholder="Quantità"
              aria-label="Quantità"
              aria-invalid={!!erroreQuantita}
              className={`w-full px-3 py-2 border rounded-lg text-sm bg-background
                focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:border-primary
                transition-all duration-200 outline-none
                ${erroreQuantita ? "border-destructive" : "border-input"}`}
            />
            {erroreQuantita && (
              <p className="mt-1 text-xs text-destructive">{erroreQuantita}</p>
            )}
          </div>

          <Button
            type="button"
            variant={azioneSelezionata === "carico" ? "success" : "destructive"}
            size="default"
            onClick={handleConferma}
            loading={isLoading}
            disabled={isLoading}
          >
            Conferma
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-4 space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">Azioni</h3>

      {/* Pulsanti azione */}
      {!azioneSelezionata && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="success"
            size="sm"
            onClick={() => handleSelectAzione("carico")}
          >
            Carica Articolo
          </Button>

          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => handleSelectAzione("scarico")}
          >
            Scarico Manuale
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSelectAzione("intervento")}
          >
            Scarico Intervento
          </Button>
        </div>
      )}

      {/* Form quantità */}
      {renderFormQuantita()}

      {/* Messaggi feedback */}
      {messaggio && (
        <div
          role="alert"
          className={`p-3 rounded-lg text-sm animate-fade-in ${
            messaggio.tipo === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-destructive-muted border border-red-200 text-destructive"
          }`}
        >
          {messaggio.testo}
        </div>
      )}
    </div>
  );
}
