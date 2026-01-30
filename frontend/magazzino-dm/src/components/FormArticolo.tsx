import { Button } from "../components/ui/button";
import { useState, useEffect, useRef, useCallback } from "react";
import { apiFetch } from "../utils/auth";
import type { Articolo } from "../../types/types.ts";
import AzioniArticolo from "./AzioniArticolo";
import { FiSearch, FiBox, FiAlertTriangle, FiCheckCircle, FiCamera, FiX } from "react-icons/fi";
import { Html5Qrcode } from "html5-qrcode";

// Funzione per pulire il barcode (rimuove prefisso "1p" o "1P")
const cleanBarcode = (barcode: string): string => {
  const trimmed = barcode.trim();
  if (trimmed.toLowerCase().startsWith("1p")) {
    return trimmed.slice(2);
  }
  return trimmed;
};

// Hook per rilevare se siamo su mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent.toLowerCase()
      );
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(isMobileDevice || isSmallScreen);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
};

export default function FormArticolo() {
  const [articolo, setArticolo] = useState<Articolo | null>(null);
  const [codice, setCodice] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerError, setScannerError] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const barcodeBufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);

  const isMobile = useIsMobile();

  // Funzione di ricerca articolo
  const searchArticolo = useCallback(async (searchCode: string) => {
    const cleanedCode = cleanBarcode(searchCode);
    if (!cleanedCode) return;

    setError("");
    setArticolo(null);
    setIsLoading(true);
    setCodice(cleanedCode);

    try {
      const res = await apiFetch(`/articoli/${cleanedCode}`, {
        method: "GET",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Errore durante la ricerca");
        return;
      }

      setArticolo(data);
    } catch {
      setError("Errore di connessione al server");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Listener globale per barcode scanner esterno
  // I lettori barcode inviano caratteri molto rapidamente (< 50ms tra un carattere e l'altro)
  // e terminano con Enter
  useEffect(() => {
    const BARCODE_THRESHOLD_MS = 50; // Tempo massimo tra caratteri per considerarlo barcode scanner
    const MIN_BARCODE_LENGTH = 3; // Lunghezza minima del barcode

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTimeRef.current;

      // Se l'input è già focused, lascia il comportamento normale
      if (document.activeElement === inputRef.current) {
        // Reset buffer se stiamo digitando manualmente
        if (timeSinceLastKey > BARCODE_THRESHOLD_MS) {
          barcodeBufferRef.current = "";
        }
        lastKeyTimeRef.current = now;
        return;
      }

      // Rileva input da barcode scanner (caratteri rapidi)
      if (timeSinceLastKey > BARCODE_THRESHOLD_MS) {
        // Nuovo potenziale barcode, reset buffer
        barcodeBufferRef.current = "";
      }

      lastKeyTimeRef.current = now;

      if (e.key === "Enter") {
        // Fine scansione barcode
        if (barcodeBufferRef.current.length >= MIN_BARCODE_LENGTH) {
          e.preventDefault();
          searchArticolo(barcodeBufferRef.current);
        }
        barcodeBufferRef.current = "";
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Accumula caratteri nel buffer
        barcodeBufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchArticolo]);

  // Gestione scanner fotocamera
  const startScanner = useCallback(async () => {
    setScannerError("");
    setShowScanner(true);

    // Aspetta che il DOM sia pronto
    await new Promise((resolve) => setTimeout(resolve, 100));

    const scannerElement = document.getElementById("barcode-scanner");
    if (!scannerElement) {
      setScannerError("Errore: elemento scanner non trovato");
      return;
    }

    try {
      const html5QrCode = new Html5Qrcode("barcode-scanner");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.5,
        },
        (decodedText) => {
          // Barcode scansionato con successo
          stopScanner();
          searchArticolo(decodedText);
        },
        () => {
          // Errore di scansione (ignorato, continua a scansionare)
        }
      );
    } catch (err) {
      setScannerError(
        err instanceof Error
          ? err.message
          : "Errore nell'avvio della fotocamera. Verifica i permessi."
      );
    }
  }, [searchArticolo]);

  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current
        .stop()
        .then(() => {
          scannerRef.current = null;
        })
        .catch(() => {
          // Ignora errori di stop
        });
    }
    setShowScanner(false);
    setScannerError("");
  }, []);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await searchArticolo(codice);
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
                  ref={inputRef}
                  type="text"
                  placeholder="Inserisci codice articolo o barcode..."
                  value={codice}
                  onChange={(e) => setCodice(e.target.value)}
                  className={`w-full pl-12 py-3.5 border border-input rounded-xl text-sm bg-background placeholder:text-muted-foreground
                    hover:border-border-focus
                    focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:border-primary focus:bg-card
                    transition-all duration-200 outline-none
                    ${isMobile ? "pr-14" : "pr-4"}`}
                  required
                />
                {/* Pulsante fotocamera per mobile */}
                {isMobile && (
                  <button
                    type="button"
                    onClick={startScanner}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                    aria-label="Scansiona con fotocamera"
                  >
                    <FiCamera className="w-5 h-5" />
                  </button>
                )}
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

      {/* Modal Scanner Fotocamera */}
      {showScanner && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={stopScanner}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-neutral-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
                  <FiCamera className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Scansiona Barcode</h2>
                  <p className="text-xs text-muted-foreground">Inquadra il codice a barre</p>
                </div>
              </div>
              <button
                type="button"
                onClick={stopScanner}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-neutral-100 rounded-lg transition-colors"
                aria-label="Chiudi"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Scanner Area */}
            <div className="p-4">
              <div
                id="barcode-scanner"
                className="w-full aspect-[4/3] bg-neutral-900 rounded-xl overflow-hidden"
              />
              {scannerError && (
                <div className="mt-4 p-3 bg-destructive-muted border border-red-200 rounded-lg">
                  <p className="text-destructive text-sm">{scannerError}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border bg-neutral-50">
              <Button type="button" variant="outline" onClick={stopScanner} className="w-full">
                Annulla
              </Button>
            </div>
          </div>
        </div>
      )}

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
