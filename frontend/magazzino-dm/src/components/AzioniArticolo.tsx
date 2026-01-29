import { useState } from "react";
import { Button } from "./ui/button";
import { apiFetch } from "../utils/auth";
import type { Articolo } from "../../types/types";

interface AzioniArticoloProps {
  articolo: Articolo;
  onMovimentoCreato?: () => void;
}

export default function AzioniArticolo({ articolo, onMovimentoCreato }: AzioniArticoloProps) {
  const [isLoading, setIsLoading] = useState<"carico" | "scarico" | "intervento" | null>(null);
  const [messaggio, setMessaggio] = useState<{ tipo: "success" | "error"; testo: string } | null>(null);

  const creaMovimento = async (qta: number, tipoMovimento: string) => {
    const oggi = new Date().toISOString().split("T")[0];

    const payload = {
      idarticolo: articolo.id,
      qta: qta,
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

    try {
      const res = await apiFetch("/movimenti/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Errore durante la creazione del movimento");
      }

      setMessaggio({ tipo: "success", testo: `${tipoMovimento} eseguito con successo` });
      onMovimentoCreato?.();
    } catch (err) {
      setMessaggio({
        tipo: "error",
        testo: err instanceof Error ? err.message : "Errore di connessione",
      });
    }
  };

  const handleCarico = async () => {
    setIsLoading("carico");
    setMessaggio(null);
    await creaMovimento(1, "Carico Manuale");
    setIsLoading(null);
  };

  const handleScaricoManuale = async () => {
    setIsLoading("scarico");
    setMessaggio(null);
    await creaMovimento(-1, "Scarico Manuale");
    setIsLoading(null);
  };

  const handleScaricoIntervento = () => {
    setIsLoading("intervento");
    setMessaggio({ tipo: "error", testo: "Funzionalità in sviluppo" });
    setIsLoading(null);
  };

  return (
    <div className="mt-4 space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">Azioni</h3>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="success"
          size="sm"
          onClick={handleCarico}
          loading={isLoading === "carico"}
          disabled={isLoading !== null}
        >
          Carica Articolo
        </Button>

        <Button
          variant="destructive"
          size="sm"
          onClick={handleScaricoManuale}
          loading={isLoading === "scarico"}
          disabled={isLoading !== null}
        >
          Scarico Manuale
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleScaricoIntervento}
          loading={isLoading === "intervento"}
          disabled={isLoading !== null}
        >
          Scarico Intervento
        </Button>
      </div>

      {messaggio && (
        <div
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
