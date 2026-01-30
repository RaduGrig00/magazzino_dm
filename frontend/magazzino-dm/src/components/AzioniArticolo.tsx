import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { apiFetch } from "../utils/auth";
import type { Articolo, Intervento } from "../../types/types";
import { FiPlus, FiMinus, FiTool, FiX, FiCalendar, FiUser, FiCheck, FiAlertCircle, FiPrinter } from "react-icons/fi";

// === TYPES ===
type TipoAzione = "carico" | "scarico" | "intervento" | "etichetta";

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
const AZIONI_CONFIG: Record<Exclude<TipoAzione, "intervento" | "etichetta">, { label: string; movimento: string }> = {
  carico: { label: "Carica", movimento: "Carico Manuale" },
  scarico: { label: "Scarica", movimento: "Scarico Manuale" },
};

const QTA_MIN = 1;
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
  isCarico: boolean,
  intervento?: Intervento | null
): MovimentoPayload => {
  const oggi = new Date().toISOString().split("T")[0];
  const qtaFinale = isCarico ? Math.abs(qta) : -Math.abs(qta);

  return {
    idarticolo: articoloId,
    qta: qtaFinale,
    movimento: tipoMovimento,
    data: oggi,
    manuale: !intervento,
    idintervento: intervento?.id ?? null,
    idddt: 0,
    iddocumento: 0,
    idsede: 0,
    reference_id: intervento?.id ?? null,
    reference_type: intervento ? "Modules\\Interventi\\Intervento" : null,
    idutente: null,
  };
};

const formatDataIntervento = (dataStr?: string): string => {
  if (!dataStr) return "";
  const data = new Date(dataStr);
  return data.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// === COMPONENT ===
export default function AzioniArticolo({ articolo, onMovimentoCreato }: AzioniArticoloProps) {
  const [azioneSelezionata, setAzioneSelezionata] = useState<TipoAzione | null>(null);
  const [quantita, setQuantita] = useState("1");
  const [erroreQuantita, setErroreQuantita] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [messaggio, setMessaggio] = useState<Messaggio | null>(null);

  // Stato per il modal interventi
  const [showModalInterventi, setShowModalInterventi] = useState(false);
  const [interventi, setInterventi] = useState<Intervento[]>([]);
  const [loadingInterventi, setLoadingInterventi] = useState(false);
  const [interventoSelezionato, setInterventoSelezionato] = useState<Intervento | null>(null);

  // Stato per il modal stampa etichette
  const [showModalEtichette, setShowModalEtichette] = useState(false);
  const [quantitaEtichette, setQuantitaEtichette] = useState("1");
  const [erroreEtichette, setErroreEtichette] = useState<string | null>(null);
  const [loadingStampa, setLoadingStampa] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const inputEtichetteRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Focus input quando si seleziona un'azione (non intervento modal)
  useEffect(() => {
    if (azioneSelezionata && azioneSelezionata !== "intervento") {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [azioneSelezionata]);

  // Focus input quando si seleziona un intervento
  useEffect(() => {
    if (interventoSelezionato && azioneSelezionata === "intervento") {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [interventoSelezionato, azioneSelezionata]);

  // Focus input quando si apre il modal etichette
  useEffect(() => {
    if (showModalEtichette) {
      setTimeout(() => {
        inputEtichetteRef.current?.focus();
        inputEtichetteRef.current?.select();
      }, 100);
    }
  }, [showModalEtichette]);

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
    setInterventoSelezionato(null);
    setShowModalInterventi(false);
    setShowModalEtichette(false);
    setQuantitaEtichette("1");
    setErroreEtichette(null);
  }, []);

  const caricaInterventi = useCallback(async () => {
    setLoadingInterventi(true);
    try {
      const res = await apiFetch("/interventi/");
      if (!res.ok) {
        throw new Error("Errore nel caricamento degli interventi");
      }
      const data = await res.json();
      setInterventi(data);
    } catch (err) {
      setMessaggio({
        tipo: "error",
        testo: err instanceof Error ? err.message : "Errore nel caricamento degli interventi",
      });
      setShowModalInterventi(false);
    } finally {
      setLoadingInterventi(false);
    }
  }, []);

  const handleSelectAzione = useCallback(
    (azione: TipoAzione) => {
      setMessaggio(null);
      setErroreQuantita(null);

      if (azione === "intervento") {
        setShowModalInterventi(true);
        caricaInterventi();
        return;
      }

      if (azione === "etichetta") {
        setShowModalEtichette(true);
        setQuantitaEtichette("1");
        setErroreEtichette(null);
        return;
      }

      setAzioneSelezionata(azione);
    },
    [caricaInterventi]
  );

  const handleSelectIntervento = useCallback((intervento: Intervento) => {
    setInterventoSelezionato(intervento);
    setShowModalInterventi(false);
    setAzioneSelezionata("intervento");
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
    if (!azioneSelezionata) return;

    // Per azione intervento, verifica che sia stato selezionato un intervento
    if (azioneSelezionata === "intervento" && !interventoSelezionato) {
      setMessaggio({ tipo: "error", testo: "Seleziona un intervento" });
      return;
    }

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

    let tipoMovimento: string;
    let isCarico = false;

    if (azioneSelezionata === "intervento" && interventoSelezionato) {
      // Scarico magazzino - Rif. attività num. {codice} del {data}
      const dataFormattata = formatDataIntervento(interventoSelezionato.data_richiesta);
      tipoMovimento = `Scarico magazzino - Rif. attività num. ${interventoSelezionato.codice} del ${dataFormattata}`;
      isCarico = false; // Scarico
    } else {
      const config = AZIONI_CONFIG[azioneSelezionata as Exclude<TipoAzione, "intervento" | "etichetta">];
      tipoMovimento = config.movimento;
      isCarico = azioneSelezionata === "carico";
    }

    const payload = buildPayload(
      articolo.id,
      validation.parsed,
      tipoMovimento,
      isCarico,
      azioneSelezionata === "intervento" ? interventoSelezionato : null
    );

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
      const successMessage =
        azioneSelezionata === "intervento" && interventoSelezionato
          ? `Scarico di ${validation.parsed} ${qtaLabel} per intervento ${interventoSelezionato.codice} eseguito`
          : `${tipoMovimento} di ${validation.parsed} ${qtaLabel} eseguito con successo`;

      setMessaggio({
        tipo: "success",
        testo: successMessage,
      });
      setAzioneSelezionata(null);
      setQuantita("1");
      setInterventoSelezionato(null);
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
  }, [azioneSelezionata, quantita, articolo, onMovimentoCreato, interventoSelezionato]);

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

  // Gestione stampa etichette
  const handleStampaEtichette = useCallback(async () => {
    const validation = validateQuantita(quantitaEtichette);
    if (!validation.valid || validation.parsed === undefined) {
      setErroreEtichette(validation.error ?? "Errore di validazione");
      inputEtichetteRef.current?.focus();
      return;
    }

    if (!articolo?.codice) {
      setMessaggio({ tipo: "error", testo: "Codice articolo non valido" });
      setShowModalEtichette(false);
      return;
    }

    setLoadingStampa(true);
    setErroreEtichette(null);

    try {
      const payload = {
        ricambi: [
          {
            codice: articolo.codice,
            quantita: validation.parsed,
          },
        ],
      };

      const res = await apiFetch("/stampa-etichette/stampa-etichette", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Errore ${res.status}: ${res.statusText}`);
      }

      const result = await res.json();

      if (result.totale_errori > 0) {
        throw new Error(result.errori?.[0]?.errore || "Errore durante la stampa");
      }

      const qtaLabel = validation.parsed === 1 ? "etichetta" : "etichette";
      setMessaggio({
        tipo: "success",
        testo: `${validation.parsed} ${qtaLabel} stampata/e con successo per ${articolo.codice}`,
      });
      setShowModalEtichette(false);
      setQuantitaEtichette("1");
    } catch (err) {
      setErroreEtichette(err instanceof Error ? err.message : "Errore di connessione al server");
    } finally {
      setLoadingStampa(false);
    }
  }, [quantitaEtichette, articolo]);

  const handleKeyDownEtichette = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleStampaEtichette();
      } else if (e.key === "Escape") {
        setShowModalEtichette(false);
        setQuantitaEtichette("1");
        setErroreEtichette(null);
      }
    },
    [handleStampaEtichette]
  );

  // Render form quantità
  const renderFormQuantita = () => {
    if (!azioneSelezionata) return null;

    // L'azione etichetta usa un modal separato
    if (azioneSelezionata === "etichetta") return null;

    // Per intervento, mostra il form solo se è stato selezionato un intervento
    if (azioneSelezionata === "intervento" && !interventoSelezionato) return null;

    const isCarico = azioneSelezionata === "carico";
    const label =
      azioneSelezionata === "intervento"
        ? `Scarico per intervento #${interventoSelezionato?.codice}`
        : AZIONI_CONFIG[azioneSelezionata as Exclude<TipoAzione, "intervento" | "etichetta">].label + " articolo";

    return (
      <div className={`p-4 rounded-xl border animate-fade-in ${
        isCarico ? "bg-brand-50 border-brand-200" : "bg-red-50 border-red-200"
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isCarico ? (
              <FiPlus className="w-4 h-4 text-brand-600" />
            ) : (
              <FiMinus className="w-4 h-4 text-red-600" />
            )}
            <span className={`text-sm font-semibold ${isCarico ? "text-brand-700" : "text-red-700"}`}>
              {label}
            </span>
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-white/50"
            aria-label="Annulla"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {azioneSelezionata === "intervento" && interventoSelezionato && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3 pb-3 border-b border-red-200">
            <span className="flex items-center gap-1">
              <FiUser className="w-3 h-3" />
              {interventoSelezionato.ragione_sociale || "N/D"}
            </span>
            <span className="flex items-center gap-1">
              <FiCalendar className="w-3 h-3" />
              {formatDataIntervento(interventoSelezionato.data_richiesta)}
            </span>
          </div>
        )}

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
              className={`w-full px-4 py-2.5 border rounded-lg text-sm bg-white
                focus:ring-2 focus:ring-offset-1 transition-all duration-200 outline-none
                ${erroreQuantita
                  ? "border-destructive focus:ring-red-200"
                  : isCarico
                    ? "border-brand-200 focus:ring-brand-200 focus:border-brand-400"
                    : "border-red-200 focus:ring-red-200 focus:border-red-400"
                }`}
            />
            {erroreQuantita && <p className="mt-1 text-xs text-destructive">{erroreQuantita}</p>}
          </div>

          <Button
            type="button"
            variant={isCarico ? "success" : "destructive"}
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

  // Render modal interventi
  const renderModalInterventi = () => {
    if (!showModalInterventi) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={() => setShowModalInterventi(false)}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col m-4 animate-slide-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-neutral-50 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
                <FiTool className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Seleziona Intervento</h2>
                <p className="text-xs text-muted-foreground">Ultimi 25 interventi</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowModalInterventi(false)}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-neutral-100 rounded-lg transition-colors"
              aria-label="Chiudi"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            {loadingInterventi ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-200 border-t-brand-600"></div>
                <p className="mt-3 text-sm text-muted-foreground">Caricamento interventi...</p>
              </div>
            ) : interventi.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FiTool className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">Nessun intervento trovato</p>
              </div>
            ) : (
              <div className="space-y-2">
                {interventi.map((intervento) => (
                  <button
                    key={intervento.id}
                    type="button"
                    onClick={() => handleSelectIntervento(intervento)}
                    className="w-full p-4 text-left bg-white border border-border rounded-xl
                      hover:bg-brand-50 hover:border-brand-300
                      focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400
                      transition-all duration-200 group"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground group-hover:text-brand-700">
                            #{intervento.codice}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <FiCalendar className="w-3 h-3" />
                            {formatDataIntervento(intervento.data_richiesta)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <FiUser className="w-3.5 h-3.5" />
                          {intervento.ragione_sociale || "Cliente non disponibile"}
                        </div>
                        {intervento.descrizione && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                            {intervento.descrizione}
                          </p>
                        )}
                      </div>
                      <div className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center">
                          <FiCheck className="w-4 h-4 text-brand-600" />
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border bg-neutral-50 rounded-b-2xl">
            <Button type="button" variant="outline" onClick={() => setShowModalInterventi(false)} className="w-full">
              Annulla
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Section title */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border"></div>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Azioni</span>
        <div className="h-px flex-1 bg-border"></div>
      </div>

      {/* Pulsanti azione */}
      {!azioneSelezionata && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <Button
            type="button"
            variant="success"
            size="default"
            onClick={() => handleSelectAzione("carico")}
            className="w-full"
            leftIcon={<FiPlus className="w-4 h-4" />}
          >
            Carico
          </Button>

          <Button
            type="button"
            variant="destructive"
            size="default"
            onClick={() => handleSelectAzione("scarico")}
            className="w-full"
            leftIcon={<FiMinus className="w-4 h-4" />}
          >
            Scarico Manuale
          </Button>

          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={() => handleSelectAzione("intervento")}
            className="w-full"
            leftIcon={<FiTool className="w-4 h-4" />}
          >
            Scarico Intervento
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="default"
            onClick={() => handleSelectAzione("etichetta")}
            className="w-full"
            leftIcon={<FiPrinter className="w-4 h-4" />}
          >
            Stampa Etichetta
          </Button>
        </div>
      )}

      {/* Form quantità */}
      {renderFormQuantita()}

      {/* Modal selezione interventi */}
      {renderModalInterventi()}

      {/* Modal stampa etichette */}
      {showModalEtichette && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => {
            setShowModalEtichette(false);
            setQuantitaEtichette("1");
            setErroreEtichette(null);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col m-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-neutral-50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
                  <FiPrinter className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Stampa Etichette</h2>
                  <p className="text-xs text-muted-foreground">Codice: {articolo.codice}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModalEtichette(false);
                  setQuantitaEtichette("1");
                  setErroreEtichette(null);
                }}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-neutral-100 rounded-lg transition-colors"
                aria-label="Chiudi"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-1">Descrizione articolo:</p>
                <p className="text-sm font-medium text-foreground">{articolo.descrizione || "N/D"}</p>
              </div>

              <div>
                <label htmlFor="quantita-etichette" className="block text-sm font-medium text-foreground mb-2">
                  Quantità etichette da stampare
                </label>
                <input
                  ref={inputEtichetteRef}
                  id="quantita-etichette"
                  type="text"
                  inputMode="numeric"
                  value={quantitaEtichette}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || /^[\d]*$/.test(value)) {
                      setQuantitaEtichette(value);
                      setErroreEtichette(null);
                    }
                  }}
                  onKeyDown={handleKeyDownEtichette}
                  placeholder="1"
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm bg-white
                    focus:ring-2 focus:ring-offset-1 transition-all duration-200 outline-none
                    ${erroreEtichette
                      ? "border-destructive focus:ring-red-200"
                      : "border-border focus:ring-brand-200 focus:border-brand-400"
                    }`}
                />
                {erroreEtichette && <p className="mt-1 text-xs text-destructive">{erroreEtichette}</p>}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border bg-neutral-50 rounded-b-2xl flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowModalEtichette(false);
                  setQuantitaEtichette("1");
                  setErroreEtichette(null);
                }}
                className="flex-1"
              >
                Annulla
              </Button>
              <Button
                type="button"
                variant="success"
                onClick={handleStampaEtichette}
                loading={loadingStampa}
                disabled={loadingStampa}
                className="flex-1"
                leftIcon={<FiPrinter className="w-4 h-4" />}
              >
                Stampa
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Messaggi feedback */}
      {messaggio && (
        <div
          role="alert"
          className={`p-4 rounded-xl text-sm animate-fade-in flex items-start gap-3 ${
            messaggio.tipo === "success"
              ? "bg-brand-50 border border-brand-200 text-brand-700"
              : "bg-destructive-muted border border-red-200 text-destructive"
          }`}
        >
          {messaggio.tipo === "success" ? (
            <FiCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <FiAlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <span className="font-medium">{messaggio.testo}</span>
        </div>
      )}
    </div>
  );
}
