const BASE_URL = import.meta.env.VITE_API_URL;

// Endpoint che non devono fare il refresh automatico del token
const AUTH_ENDPOINTS = ["/auth/login", "/auth/refresh", "/auth/signup"];

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});

  // Se non c'è già un Content-Type e stai inviando un body → imposta JSON a meno che sia FormData (per login e signup)
  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Se l'endpoint non è già completo, aggiungi la base URL
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  // Verifica se è un endpoint di autenticazione
  const isAuthEndpoint = AUTH_ENDPOINTS.some(authPath => endpoint.includes(authPath));

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // invia i cookie con la request (autenticazione)
  });

  // Per gli endpoint di autenticazione, restituisci sempre la risposta senza ulteriori elaborazioni
  if (isAuthEndpoint) {
    return response;
  }

  // Gestione 401 solo per endpoint non di autenticazione
  if (response.status === 401) {
    console.warn("⚠️ Token scaduto, tentativo di refresh...");

    const refreshUrl = `${BASE_URL}/auth/refresh`;

    const refreshRes = await fetch(refreshUrl, {
      method: "POST",
      credentials: "include",
    });

    if (refreshRes.ok) {
      console.log("Token rinnovato, ritento la richiesta originale");
      return await fetch(url, {
        ...options,
        headers,
        credentials: "include",
      });
    } else {
      console.warn("❌ Refresh fallito - redirect al login");
      window.location.href = "/login";
      return refreshRes;
    }
  }

  // Gestione HTTP 429 (rate limit da backend)
  if (response.status === 429) {
    const data = await response.json().catch(() => ({}));
    const msg = data.detail || "Troppe richieste, attendi prima di riprovare.";
    console.warn("⏳ Rate limit:", msg);
    throw new Error(msg);
  }

  return response;
}