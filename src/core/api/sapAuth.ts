// ─── Gestion session SAP B1 — Compte service partagé ─────────────────────────
// La session SAP est entièrement transparente pour l'utilisateur :
// - Un seul compte SAP "service" se connecte au démarrage
// - L'authentification utilisateur est gérée dans authStore (UDT @GA_USERS)
// Sécurité : le cookie B1SESSION n'est PAS mis en cache (SecureStore supprimé)
// → toujours un fresh login avec les credentials .env au démarrage de l'app
import { SAP_BASE_URL, SAP_COMPANY_DB, SAP_USER, SAP_PASSWORD, SESSION_REFRESH_MS, IS_DEV } from '../config/constants';
import { ENDPOINTS } from './endpoints';

let sessionCookie: string | null = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

// ─── Login compte service (interne) ──────────────────────────────────────────

async function serviceLogin(): Promise<void> {
  const url = `${SAP_BASE_URL}${ENDPOINTS.LOGIN}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      CompanyDB: SAP_COMPANY_DB,
      UserName: SAP_USER,
      Password: SAP_PASSWORD,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error?.message?.value ?? `Erreur SAP ${response.status}`);
  }

  const setCookieHeader = response.headers.get('set-cookie') ?? '';
  const match = setCookieHeader.match(/B1SESSION=([^;]+)/);
  if (!match) throw new Error('Session SAP introuvable dans la réponse');

  sessionCookie = match[1];
  // Pas de persistance SecureStore — session en mémoire uniquement
  _startRefreshTimer();

  if (IS_DEV) console.log('[sapAuth] Compte service connecté');
}

// ─── Timer de rafraîchissement ────────────────────────────────────────────────

function _startRefreshTimer(): void {
  _stopRefreshTimer();
  refreshTimer = setInterval(async () => {
    try {
      await serviceLogin();
      if (IS_DEV) console.log('[sapAuth] Session service rafraîchie');
    } catch {
      if (IS_DEV) console.warn('[sapAuth] Échec rafraîchissement session service');
    }
  }, SESSION_REFRESH_MS);
}

function _stopRefreshTimer(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

// ─── API publique ─────────────────────────────────────────────────────────────

const sapAuth = {
  /** Retourne le cookie de session actuel (en mémoire) */
  getSession(): string | null {
    return sessionCookie;
  },

  /**
   * Établit une nouvelle session SAP au démarrage de l'app.
   * Toujours un fresh login — pas de cache, pas de SecureStore.
   * Les credentials viennent du .env (compte service partagé).
   */
  async restoreSession(): Promise<boolean> {
    try {
      await serviceLogin();
      return true;
    } catch (err) {
      if (IS_DEV) console.error('[sapAuth] Impossible de se connecter au démarrage:', err);
      return false;
    }
  },

  /**
   * Refresh sur 401 — reconnecte silencieusement le compte service.
   * Ne force plus le logout utilisateur.
   */
  async refreshSession(): Promise<void> {
    await serviceLogin();
  },

  /**
   * Arrêt du timer de refresh (appelé à la fermeture de l'app).
   * La session SAP expire naturellement côté serveur.
   */
  cleanup(): void {
    _stopRefreshTimer();
    sessionCookie = null;
  },
};

export { sapAuth };
