import { apiFetch } from "../utils/auth";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import logo from "@/assets/logo_completo.png";
import { Button } from "../components/ui/button";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("password", password);

      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Credenziali non valide");
        return;
      }

      console.log("Login OK, cookie settati dal backend.");
      navigate("/");
    } catch (err) {
      setError("Errore di connessione");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary-50 via-background to-background-subtle">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-100 rounded-full opacity-50 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-100 rounded-full opacity-50 blur-3xl" />
      </div>

      <form
        onSubmit={handleLogin}
        className="relative bg-card w-full max-w-md mx-4 rounded-2xl shadow-xl border border-border overflow-hidden animate-fade-in"
      >
        {/* Logo Header */}
        <div className="flex flex-col items-center justify-center py-8 bg-gradient-to-b from-muted to-card border-b border-border">
          <img src={logo} alt="Logo" className="h-16 mb-3" />
          <p className="text-sm text-muted-foreground">Magazzino DM</p>
        </div>

        {/* Form */}
        <div className="p-8">
          <div className="space-y-4">
            {/* Username */}
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                <FaUser className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Nome utente"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-input rounded-xl text-sm bg-background placeholder:text-muted-foreground
                  hover:border-border-focus
                  focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:border-primary focus:bg-card
                  transition-all duration-200 outline-none"
                required
              />
            </div>

            {/* Password */}
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                <FaLock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-3 border border-input rounded-xl text-sm bg-background placeholder:text-muted-foreground
                  hover:border-border-focus
                  focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:border-primary focus:bg-card
                  transition-all duration-200 outline-none"
                required
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
              </button>
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
            loading={isLoading}
            className="w-full mt-6"
            size="lg"
          >
            {isLoading ? "Accesso in corso..." : "Accedi"}
          </Button>
        </div>
      </form>
    </div>
  );
}
