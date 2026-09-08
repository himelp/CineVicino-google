/**
 * CineVicino — Defensive HTTP / Fetch utilities
 * Protects frontend callers from raw JSON.parse exceptions when intermediate proxies
 * (nginx, Cloudflare Tunnel, load balancers) return HTML error pages (502 Bad Gateway,
 * 504 Gateway Timeout, 403 Cloudflare challenge, etc.).
 */

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

/**
 * Safely parse a fetch Response as JSON with detailed inspection of Content-Type and status.
 * If the response is HTML or text (e.g. <!DOCTYPE html> 504 Gateway Timeout), extracts
 * a human-readable error instead of throwing a SyntaxError.
 */
export async function safeReadJson<T = any>(res: Response): Promise<ApiResponse<T>> {
  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      const data = await res.json();
      if (!res.ok) {
        const errorMsg =
          data?.error ||
          data?.message ||
          data?.details ||
          `Errore del server (HTTP ${res.status})`;
        return { ok: false, status: res.status, error: errorMsg, data };
      }
      return { ok: true, status: res.status, data };
    } catch (parseErr: any) {
      return {
        ok: false,
        status: res.status,
        error: `Risposta JSON non valida ricevuta dal server (${parseErr?.message || 'formato non valido'})`
      };
    }
  }

  // Non-JSON response (usually HTML error page from proxy or web server)
  const rawText = await res.text().catch(() => '');
  let errorMessage = `Risposta inattesa dal server (HTTP ${res.status})`;

  if (res.status === 504 || rawText.includes('504 Gateway Time-out') || rawText.includes('Gateway Timeout')) {
    errorMessage = 'Gateway Timeout (HTTP 504): Il proxy o Cloudflare ha interrotto la connessione per timeout. L\'operazione potrebbe essere ancora in corso sul server.';
  } else if (res.status === 502 || rawText.includes('502 Bad Gateway')) {
    errorMessage = 'Bad Gateway (HTTP 502): Il server upstream non è raggiungibile o ha interrotto la connessione.';
  } else if (res.status === 524 || rawText.includes('Error 524') || rawText.includes('A timeout occurred')) {
    errorMessage = 'Cloudflare Timeout (HTTP 524): La connessione è scaduta prima che il server completasse la risposta.';
  } else if (res.status === 401 || res.status === 403) {
    errorMessage = `Accesso non autorizzato o sessione scaduta (HTTP ${res.status}). Effettua nuovamente il login.`;
  } else if (res.status === 404) {
    errorMessage = `Risorsa API non trovata (HTTP 404).`;
  } else if (res.status >= 500) {
    errorMessage = `Errore interno del server (HTTP ${res.status}).`;
  }

  return { ok: false, status: res.status, error: errorMessage };
}

/**
 * Perform a fetch and safely parse the JSON response.
 */
export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(input, init);
    return await safeReadJson<T>(res);
  } catch (netErr: any) {
    return {
      ok: false,
      status: 0,
      error: `Errore di rete o connessione interrotta: ${netErr?.message || netErr}`
    };
  }
}
