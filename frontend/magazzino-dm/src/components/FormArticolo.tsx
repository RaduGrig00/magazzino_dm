import { Button } from "../components/ui/button";
import { useState, useEffect, useRef, useCallback } from "react";
import { apiFetch } from "../utils/auth";
import type { Articolo } from "../../types/types.ts";
import AzioniArticolo from "./AzioniArticolo";
import { FiSearch, FiBox, FiAlertTriangle, FiCheckCircle, FiCamera, FiX, FiZap, FiZapOff } from "react-icons/fi";
import { BrowserMultiFormatReader } from "@zxing/library";

// URL beep
const BEEP_SOUND = "https://actions.google.com/sounds/v1/alarms/beep_short.ogg";

const cleanBarcode = (barcode: string): string => {
  const trimmed = barcode.trim();
  if (trimmed.toLowerCase().startsWith("1p")) return trimmed.slice(2);
  return trimmed;
};

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

  // Scanner states
  const [showScanner, setShowScanner] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [isFlashAvailable, setIsFlashAvailable] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  const barcodeBufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);

  const isMobile = useIsMobile();

  // --- LOGICA RICERCA ---
  const searchArticolo = useCallback(async (searchCode: string) => {
    const cleanedCode = cleanBarcode(searchCode);
    if (!cleanedCode) return;

    setError("");
    setArticolo(null);
    setIsLoading(true);
    setCodice(cleanedCode);

    try {
      const res = await apiFetch(`/articoli/${cleanedCode}`, { method: "GET" });
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

  // --- LOGICA BARCODE SCANNER USB ---
  useEffect(() => {
    const BARCODE_THRESHOLD_MS = 50;
    const MIN_BARCODE_LENGTH = 3;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTimeRef.current;

      if (document.activeElement === inputRef.current) {
        if (timeSinceLastKey > BARCODE_THRESHOLD_MS) barcodeBufferRef.current = "";
        lastKeyTimeRef.current = now;
        return;
      }

      if (timeSinceLastKey > BARCODE_THRESHOLD_MS) barcodeBufferRef.current = "";
      lastKeyTimeRef.current = now;

      if (e.key === "Enter") {
        if (barcodeBufferRef.current.length >= MIN_BARCODE_LENGTH) {
          e.preventDefault();
          searchArticolo(barcodeBufferRef.current);
        }
        barcodeBufferRef.current = "";
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        barcodeBufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchArticolo]);

  // --- LOGICA SCANNER FOTOCAMERA ---
  const toggleFlash = async () => {
    if (trackRef.current && isFlashAvailable) {
      try {
        await trackRef.current.applyConstraints({ advanced: [{ torch: !isFlashOn } as any] });
        setIsFlashOn((prev) => !prev);
      } catch (err) {
        console.error("Errore cambio flash:", err);
      }
    }
  };

  const stopScanner = useCallback(() => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      codeReaderRef.current = null;
    }
    if (trackRef.current) {
      trackRef.current.stop();
      trackRef.current = null;
    }
    setShowScanner(false);
    setIsFlashOn(false);
    setScannerError("");
  }, []);

  const startScanner = useCallback(async () => {
    setScannerError("");
    setShowScanner(true);
    setIsFlashOn(false);
    setIsFlashAvailable(false);

    await new Promise((res) => setTimeout(res, 100));

    if (!videoRef.current) {
      setScannerError("Elemento video non trovato");
      return;
    }

    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 10 } },
      });
      videoRef.current!.srcObject = stream;
      const track = stream.getVideoTracks()[0];
      trackRef.current = track;

      // Controllo torch
      const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
      if (capabilities?.torch) setIsFlashAvailable(true);

      // Decodifica video
      if (!videoRef.current) throw new Error("Elemento video non trovato");

      codeReader
        .decodeFromVideoElementContinuously(videoRef.current, (result: any) => {
          if (result) {
            const audio = new Audio(BEEP_SOUND);
            audio.play().catch(() => {});
            stopScanner();
            const cleaned = cleanBarcode(result.getText());
            searchArticolo(cleaned);
          }
        })
        .catch((err) => {
          console.error(err);
          setScannerError("Errore durante la scansione");
        });

    } catch (err) {
      setScannerError(err instanceof Error ? err.message : "Errore avvio fotocamera");
    }
  }, [stopScanner, searchArticolo]);

  useEffect(() => {
    return () => stopScanner();
  }, [stopScanner]);

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
                {isMobile && (
                  <button
                    type="button"
                    onClick={startScanner}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                  >
                    <FiCamera className="w-5 h-5" />
                  </button>
                )}
              </div>
              <Button type="submit" disabled={isLoading} loading={isLoading} size="lg" className="sm:w-auto w-full">
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
              <button type="button" onClick={stopScanner} className="p-2 text-muted-foreground hover:text-foreground hover:bg-neutral-100 rounded-lg transition-colors">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Scanner Area */}
            <div className="p-4 relative bg-black">
              <video ref={videoRef} className="w-full aspect-[4/3] bg-neutral-900 rounded-xl object-cover" autoPlay muted />

              {isFlashAvailable && (
                <button
                  type="button"
                  onClick={toggleFlash}
                  className={`absolute bottom-6 right-6 p-3 rounded-full shadow-lg transition-all z-10 border border-white/20 ${
                    isFlashOn ? "bg-yellow-400 text-black hover:bg-yellow-500" : "bg-black/50 text-white hover:bg-black/70 backdrop-blur-md"
                  }`}
                >
                  {isFlashOn ? <FiZapOff className="w-6 h-6" /> : <FiZap className="w-6 h-6" />}
                </button>
              )}

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

          <div className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-neutral-50 rounded-xl">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Quantità disponibile
                </p>
                <p className={`text-2xl font-bold ${articolo.qta <= articolo.threshold_qta ? "text-amber-600" : "text-brand-600"}`}>
                  {Math.trunc(articolo.qta)}
                </p>
              </div>
              <div className="p-4 bg-neutral-50 rounded-xl">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Soglia minima
                </p>
                <p className="text-2xl font-bold text-foreground">{Math.trunc(articolo.threshold_qta)}</p>
              </div>
            </div>

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

            <AzioniArticolo articolo={articolo} />
          </div>
        </div>
      )}
    </div>
  );
}
