import { useNavigate } from "react-router-dom";
import { FiLogOut, FiPackage } from "react-icons/fi";
import FormArticolo from "../components/FormArticolo";
import logo from "@/assets/logo_completo.png";
import { apiFetch } from "../utils/auth";
import { useState } from "react";

export default function Home() {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // Ignore errors, proceed with logout
    } finally {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background-subtle">
      {/* Header */}
      <header className="gradient-header text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo e titolo */}
            <div className="flex items-center gap-4">
              <div className="bg-white rounded-lg p-1.5 shadow-sm">
                <img src={logo} alt="Data Emme" className="h-8 w-auto" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold tracking-tight">Magazzino DM</h1>
                <p className="text-xs text-white/70">Gestione inventario</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white/90 hover:text-white
                  hover:bg-white/10 rounded-lg transition-all duration-200 disabled:opacity-50"
              >
                <FiLogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Esci</span>
              </button>
            </div>
          </div>
        </div>
      </header>

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
                  Gestione Articoli
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cerca un articolo per codice o barcode per visualizzare le informazioni
                  e gestire i movimenti di magazzino.
                </p>
              </div>
            </div>
          </div>

          {/* Form articolo */}
          <FormArticolo />
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 px-4 border-t border-border bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-xs text-muted-foreground">
            Data Emme S.r.l. - Magazzino DM v1.0
          </p>
        </div>
      </footer>
    </div>
  );
}
