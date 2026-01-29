import { Button } from "../components/ui/button";
import { useState } from "react";
import { apiFetch } from "../utils/auth";
import type { Articolo } from "../../types/types.ts";
import AzioniArticolo from "./AzioniArticolo";

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

  return (
    <div>
      <form
        onSubmit={handleSearch}
        className="relative bg-card w-full max-w-md mx-auto rounded-2xl shadow-xl border border-border overflow-hidden animate-fade-in"
      >
        {/* Form */}
        <div className="p-8">
          <div className="space-y-4">
            {/* Codice */}
            <div className="relative">
              <input
                type="text"
                placeholder="Inserisci codice articolo"
                value={codice}
                onChange={(e) => setCodice(e.target.value)}
                className="w-full px-4 py-3 border border-input rounded-xl text-sm bg-background placeholder:text-muted-foreground
                      hover:border-border-focus
                      focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:border-primary focus:bg-card
                      transition-all duration-200 outline-none"
                required
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-destructive-muted border border-red-200 rounded-lg animate-fade-in">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full mt-6"
            size="lg"
          >
            {isLoading ? "Ricerca in corso..." : "Cerca Articolo"}
          </Button>
        </div>
      </form>

      {/* Risultato ricerca */}
      {articolo && (
        <div className="mt-6 max-w-md mx-auto bg-card rounded-2xl shadow-lg border border-border p-6 animate-fade-in">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Articolo trovato
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Codice:</dt>
              <dd className="font-medium">{articolo.codice}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Descrizione:</dt>
              <dd className="font-medium">{articolo.descrizione}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Quantità a magazzino:</dt>
              <dd className="font-medium">{Math.trunc(articolo.qta)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Soglia minima:</dt>
              <dd className="font-medium">{Math.trunc(articolo.threshold_qta)}</dd>
            </div>
          </dl>

          <AzioniArticolo articolo={articolo} />
        </div>
      )}
    </div>
  );
}
