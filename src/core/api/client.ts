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

// ── Interceptor RESPONSE : gestion 401 (session expirée → redirect login) ───
apiClient.interceptors.response.use(
  (response) => response,
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
        const { handleMockFallback } = await import('./mockFallback');
        let requestData = originalRequest.data;
        if (typeof requestData === 'string') {
          try { requestData = JSON.parse(requestData); } catch (_) {}
        }
        const fallbackRes = handleMockFallback(
          originalRequest.url || '',
          originalRequest.method || 'GET',
          requestData
        );
        return Promise.resolve(fallbackRes);
      } catch {
        // En cas d'échec du mock, propager l'erreur d'origine
      }
    }

    return Promise.reject(error);
  }
);

