const BASE_URL = import.meta.env.VITE_API_URL;

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});

  // Se non c'è già un Content-Type e stai inviando un body → imposta JSON a meno che sia FormData (per login e signup)
  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // 🔹 Se l'endpoint non è già completo, aggiungi la base URL
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", //invia i cookie con la request (autenticazione)
  });

  if (response.status === 401) {
  console.warn("⚠️ Token scaduto, tentativo di refresh...");

  // prova a rinnovare l'access token
  const refreshUrl = `${BASE_URL}/auth/refresh`;

  const refreshRes = await fetch(refreshUrl, {
    method: "POST",
    credentials: "include",
  });

  if (refreshRes.ok) {
    console.log("Token rinnovato, ritento la richiesta originale");
    // ripeti la richiesta originale
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

  //Gestione HTTP 429 (rate limit da backend)
  if (response.status === 429) {
    const data = await response.json().catch(() => ({}));
    const msg = data.detail || "Troppe richieste, attendi prima di riprovare.";
    console.warn("⏳ Rate limit:", msg);
    throw new Error(msg); // così puoi gestirlo nel try/catch del FE
  }

  //Gestione errori generici lato server
  if (!response.ok) {
    let message = `Errore ${response.status}`;
    try {
      const data = await response.json();
      message = data.detail || JSON.stringify(data);
    } catch {
      // fallback
    }
    throw new Error(message);
  }

  return response;
}