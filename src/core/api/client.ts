// ─── Instance Axios avec interceptors SAP B1 ─────────────────────────────────
import axios, { InternalAxiosRequestConfig } from 'axios';
import { SAP_BASE_URL, API_TIMEOUT } from '../config/constants';
import { sapAuth } from './sapAuth';

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Callback enregistré par authStore — évite l'import circulaire
// authStore → sapAuth → client ← authStore (cycle cassé)
let _onUnauthorized: (() => void) | null = null;

/** Enregistre l'action à déclencher sur 401 non récupérable (ex: forcer logout) */
export function setUnauthorizedHandler(cb: () => void): void {
  _onUnauthorized = cb;
}

export const apiClient = axios.create({
  baseURL: SAP_BASE_URL,
  timeout: API_TIMEOUT,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// ── Interceptor REQUEST : injection du cookie de session SAP ─────────────────
apiClient.interceptors.request.use((config) => {
  const session = sapAuth.getSession();
  if (session) {
    config.headers['Cookie'] = `B1SESSION=${session}`;
  }
  return config;
});

// ── Mode Secours : renvoie les données Elton Oil en mémoire ──────────────────
async function runMockFallback(config: InternalAxiosRequestConfig) {
  const { handleMockFallback } = await import('./mockFallback');
  let requestData = config.data;
  if (typeof requestData === 'string') {
    try { requestData = JSON.parse(requestData); } catch (_) {}
  }
  return handleMockFallback(config.url || '', config.method || 'GET', requestData);
}

/** Vercel (rewrite SPA) répond 200 + index.html à toute URL d'API inconnue */
function isSpaHtmlResponse(data: unknown, headers: Record<string, unknown> | undefined): boolean {
  const contentType = String(headers?.['content-type'] ?? '').toLowerCase();
  if (contentType.includes('text/html')) return true;
  return typeof data === 'string' && /^\s*<(!doctype|html)/i.test(data);
}

// ── Interceptor RESPONSE : gestion 401 (session expirée → redirect login) ───
apiClient.interceptors.response.use(
  async (response) => {
    if (isSpaHtmlResponse(response.data, response.headers as Record<string, unknown>)) {
      try {
        return (await runMockFallback(response.config)) as typeof response;
      } catch {
        // fallback indisponible → réponse d'origine
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config as RetryableConfig;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await sapAuth.refreshSession();
        return apiClient.request(originalRequest);
      } catch {
        // Session expirée et refresh impossible → notifier authStore via callback
        _onUnauthorized?.();
        return Promise.reject(error);
      }
    }

    // ── Mode Secours Automatique (Vercel / Serveur déconnecté / Démo 24/7) ────
    // Si le serveur SAP n'est pas joignable (erreur réseau, 404, 405, 403, 502, machine éteinte),
    // l'application bascule automatiquement sur les données Elton Oil sans planter.
    if (
      !error.response ||
      error.code === 'ERR_NETWORK' ||
      error.response?.status === 404 ||
      error.response?.status === 405 ||
      error.response?.status === 403 ||
      error.response?.status >= 500
    ) {
      try {
        return Promise.resolve(await runMockFallback(originalRequest));
      } catch {
        // En cas d'échec du mock, propager l'erreur d'origine
      }
    }

    return Promise.reject(error);
  }
);

