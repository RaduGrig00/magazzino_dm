import { Button } from "../components/ui/button";
import { useState } from "react";
import { apiFetch } from "../utils/auth";
import type { Articolo } from "../../types/types.ts";
import AzioniArticolo from "./AzioniArticolo";
import { FiSearch, FiBox, FiAlertTriangle, FiCheckCircle } from "react-icons/fi";

export default function FormArticolo() {
  const [articolo, setArticolo] = useState<Articolo | null>(null);
  const [codice, setCodice] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setArticolo(null);
    setIsLoading(true);

    try {
      const res = await apiFetch(`/articoli/${codice}`, {
        method: "GET",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Errore durante la ricerca");
        return;
      }

      setArticolo(data);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      setError("Errore di connessione al server");
    } finally {
      setIsLoading(false);
    }
  };

  const getQuantityStatus = (qta: number, threshold: number) => {
    if (qta <= 0) return { status: "critical", label: "Esaurito", icon: FiAlertTriangle };
    if (qta <= threshold) return { status: "warning", label: "Sotto soglia", icon: FiAlertTriangle };
    return { status: "ok", label: "Disponibile", icon: FiCheckCircle };
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden animate-fade-in">
        <div className="p-6">
          <form onSubmit={handleSearch}>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                  <FiSearch className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  placeholder="Inserisci codice articolo o barcode..."
                  value={codice}
                  onChange={(e) => setCodice(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 border border-input rounded-xl text-sm bg-background placeholder:text-muted-foreground
                    hover:border-border-focus
                    focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:border-primary focus:bg-card
                    transition-all duration-200 outline-none"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                loading={isLoading}
                size="lg"
                className="sm:w-auto w-full"
              >
                {isLoading ? "Ricerca..." : "Cerca"}
              </Button>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-destructive-muted border border-red-200 rounded-xl animate-fade-in">
              <div className="flex items-center gap-3">
                <FiAlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
                <p className="text-destructive text-sm font-medium">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Article Result */}
      {articolo && (
        <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="px-6 py-4 border-b border-border bg-neutral-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
                  <FiBox className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{articolo.codice}</h3>
                  <p className="text-sm text-muted-foreground">{articolo.descrizione || "Nessuna descrizione"}</p>
                </div>
              </div>
              {(() => {
                const status = getQuantityStatus(articolo.qta, articolo.threshold_qta);
                const StatusIcon = status.icon;
                return (
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
                    ${status.status === "critical" ? "badge-critical" : ""}
                    ${status.status === "warning" ? "badge-low" : ""}
                    ${status.status === "ok" ? "badge-ok" : ""}
                  `}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {status.label}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-neutral-50 rounded-xl">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Quantità disponibile
                </p>
                <p className={`text-2xl font-bold ${
                  articolo.qta <= articolo.threshold_qta ? "text-amber-600" : "text-brand-600"
                }`}>
                  {Math.trunc(articolo.qta)}
                </p>
              </div>
              <div className="p-4 bg-neutral-50 rounded-xl">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Soglia minima
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {Math.trunc(articolo.threshold_qta)}
                </p>
              </div>
            </div>

            {/* Additional Info */}
            {(articolo.barcode || articolo.note) && (
              <div className="space-y-3 mb-6 p-4 bg-neutral-50 rounded-xl">
                {articolo.barcode && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Barcode</span>
                    <span className="font-mono font-medium">{articolo.barcode}</span>
                  </div>
                )}
                {articolo.note && (
                  <div className="text-sm">
                    <span className="text-muted-foreground block mb-1">Note</span>
                    <span className="text-foreground">{articolo.note}</span>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <AzioniArticolo articolo={articolo} />
          </div>
        </div>
      )}
    </div>
  );
}
