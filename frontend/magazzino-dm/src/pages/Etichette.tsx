import { FiPackage, FiPrinter, FiTool } from "react-icons/fi";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useCallback, useRef, useState } from "react";
import InputEtichetta from "../components/InputEtichetta";
import { quantitaSchema } from "../schemas/quantita.schema";
import { descrizioneSchema } from "../schemas/descrizione.schema";
import { apiFetch } from "../utils/auth";
import type { Messaggio } from "../../types/types";
import { Button } from "../components/ui/button";
import AnteprimaEtichetta from "../components/AnteprimaEtichetta";

export default function Etichette() {
  const [stampanteSelezionata, setStampanteSelezionata] = useState<
    "LAB" | "Magazzino"
  >("Magazzino");
  const [quantitaEtichette, setQuantitaEtichette] = useState<string>("1");
  const [erroreEtichette, setErroreEtichette] = useState<string | null>(null);
  const [erroreDescrizione, setErroreDescrizione] = useState<string | null>(
    null,
  );
  const [erroreQuantita, setErroreQuantita] = useState<string | null>(null);
  const [loadingStampa, setLoadingStampa] = useState(false);
  const [messaggio, setMessaggio] = useState<Messaggio | null>(null);
  const [descrizione, setDescrizione] = useState<string>("");

  const inputRef = useRef<HTMLInputElement>(null);

  const handleStampaEtichette = useCallback(async () => {
    setErroreDescrizione(null);
    setErroreQuantita(null);
    setErroreEtichette(null);
    
    const resultDescrizione = descrizioneSchema.safeParse(descrizione);
    if (!resultDescrizione.success) {
      setErroreDescrizione(resultDescrizione.error.issues[0].message);
      return;
    }

    const resultQuantita = quantitaSchema.safeParse(quantitaEtichette);
    if (!resultQuantita.success) {
      setErroreQuantita(resultQuantita.error.issues[0].message);
      inputRef.current?.focus();
      return;
    }

    const parsedQuantita = resultQuantita.data;
    const parsedDescrizione = resultDescrizione.data;

    setLoadingStampa(true);
    setErroreEtichette(null);

    try {
      const payload = {
        ricambi: [
          {
            descrizione: parsedDescrizione,
            quantita: parsedQuantita,
          },
        ],
        stampante: stampanteSelezionata,
      };

      const res = await apiFetch("/stampa-etichette/etichetta-libera", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.detail || `Errore ${res.status}: ${res.statusText}`,
        );
      }

      const result = await res.json();

      if (result.totale_errori > 0) {
        throw new Error(
          result.errori?.[0]?.errore || "Errore durante la stampa",
        );
      }

      const qtaLabel = parsedQuantita === 1 ? "etichetta" : "etichette";
      setMessaggio({
        tipo: "success",
        testo: `${parsedQuantita} ${qtaLabel} stampata/e con successo`,
      });
      setQuantitaEtichette("1");
    } catch (err) {
      setErroreEtichette(
        err instanceof Error ? err.message : "Errore di connessione al server",
      );
    } finally {
      setLoadingStampa(false);
    }
  }, [quantitaEtichette]);

  const handleKeyDownEtichette = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleStampaEtichette();
      } else if (e.key === "Escape") {
        setQuantitaEtichette("1");
        setErroreEtichette(null);
      }
    },
    [handleStampaEtichette],
  );

  return (
    <div className="min-h-screen flex flex-col bg-background-subtle">
      {/* Header */}
      <Header />

      {/* Main content */}
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Welcome card */}
          <div className="bg-white rounded-2xl shadow-sm border border-border p-6 mb-8 animate-fade-in">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center">
                <FiPackage className="w-6 h-6 text-brand-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Stampa etichetta libera
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Inserisci il testo desiderato nel campo di input e scegli la
                  periferica su cui stampare. <br />
                  N.B. Il PC in magazzino deve essere acceso per poter
                  effettuare la stampa, dato che è il PC ad essere in ascolto
                  sulla porta 9100 reindirizzando da lì le stampe alla Zebra.
                </p>
              </div>
            </div>
          </div>

          {/* Form articolo */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Seleziona Stampante
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStampanteSelezionata("LAB")}
                className={`px-4 py-2.5 rounded-lg text-sm border transition-all ${
                  stampanteSelezionata === "LAB"
                    ? "bg-brand-50 border-brand-500 text-brand-700 ring-1 ring-brand-500"
                    : "bg-white border-border text-muted-foreground hover:bg-neutral-50"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <FiPrinter className="w-4 h-4" />
                  <span>Laboratorio</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStampanteSelezionata("Magazzino")}
                className={`px-4 py-2.5 rounded-lg text-sm border transition-all ${
                  stampanteSelezionata === "Magazzino"
                    ? "bg-brand-50 border-brand-500 text-brand-700 ring-1 ring-brand-500"
                    : "bg-white border-border text-muted-foreground hover:bg-neutral-50"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <FiTool className="w-4 h-4" /> <span>Magazzino</span>
                </div>
              </button>
            </div>
          </div>
          <div className="flex flex-row">
            <InputEtichetta
              value={descrizione}
              onChange={(val) => {
                setDescrizione(val);
                setErroreDescrizione(null);
              }}
            />
          </div>
          {erroreDescrizione && (
            <p className="mt-1 text-xs text-destructive">{erroreDescrizione}</p>
          )}
          <div className="flex flex-col items-center">
            <label className="block text-sm font-medium text-foreground mb-2">
              Anteprima
            </label>
            <AnteprimaEtichetta descrizione={descrizione} />
          </div>
          <div>
            <label
              htmlFor="quantita-etichette"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Quantità etichette da stampare
            </label>
            <input
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
                    ${
                      erroreEtichette
                        ? "border-destructive focus:ring-red-200"
                        : "border-border focus:ring-brand-200 focus:border-brand-400"
                    }`}
            />
            {erroreQuantita && (
              <p className="mt-1 text-xs text-destructive">{erroreQuantita}</p>
            )}
          </div>
          {messaggio && (
            <p className={`mt-2 text-sm ${
                messaggio.tipo === "success" ? "text-green-600" : "text-destructive"
            }`}>
                {messaggio.testo}
            </p>
            )}
          <div className="px-6 py-4 border-t border-border bg-neutral-50 rounded-b-2xl flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
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
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
