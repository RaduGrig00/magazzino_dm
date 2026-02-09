import { useNavigate } from "react-router-dom";
import { FiLogOut} from "react-icons/fi";
import logo from "@/assets/logo_completo.png";
import { apiFetch } from "../utils/auth";
import { useState } from "react";
import { Button } from "./ui/button";

interface NavItem{
    name: string;
    href: string;
}

export default function Header() {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const NAV_LINKS : readonly NavItem[] = [
    { name: "Home", href: "/"},
    { name: "Etichette", href: "/etichette"},
  ] as const;

  const currentPath = window.location.pathname;
  const isActive = (href: string) => {
    if (href==='/') return currentPath === '/';
    return currentPath.startsWith(href);
  }

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
    <>
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
                <h1 className="text-lg font-semibold tracking-tight">
                  Magazzino DM
                </h1>
                <p className="text-xs text-white/70">Gestione inventario</p>
              </div>
              <div className="flex items-center gap-8">
                {NAV_LINKS.map(({ name, href }) => (
                    <Button
                        key={name}
                        onClick={() => (window.location.href = href)}
                        data-active={isActive(href)}>
                            {name}
                    </Button>
                ))}
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
    </>
  );
}
