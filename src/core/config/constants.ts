// ─── Configuration globale — chargée depuis les variables d'environnement ────
export const SAP_BASE_URL = process.env.EXPO_PUBLIC_SAP_BASE_URL!;
export const SAP_COMPANY_DB = process.env.EXPO_PUBLIC_SAP_COMPANY_DB!;
export const SAP_USER = process.env.EXPO_PUBLIC_SAP_USER!;
/** Mot de passe du compte SAP service partagé — compte technique, pas un mot de passe utilisateur */
export const SAP_PASSWORD = process.env.EXPO_PUBLIC_SAP_PASSWORD ?? '';
export const PRINT_MODE = (process.env.EXPO_PUBLIC_PRINT_MODE ?? 'pdf') as 'pdf' | 'zpl';
export const API_TIMEOUT = Number(process.env.EXPO_PUBLIC_API_TIMEOUT) || 15000;
export const SESSION_REFRESH_MS =
  Number(process.env.EXPO_PUBLIC_SESSION_REFRESH_INTERVAL) || 1500000;
export const N_WEEKS = Number(process.env.EXPO_PUBLIC_N_WEEKS) || 8;
/** Nombre de semaines de couverture cible pour la suggestion de commande */
export const N_WEEKS_COVERAGE = Number(process.env.EXPO_PUBLIC_N_WEEKS_COVERAGE) || 4;
export const IS_DEV = process.env.EXPO_PUBLIC_ENV === 'development';

// Les entrepôts sont récupérés dynamiquement via GET /Warehouses
// Pas de liste hardcodée — voir useWarehouses() hook

/**
 * Codes utilisateurs ayant accès admin par défaut (fallback de secours).
 * La gestion des rôles est pilotée dynamiquement par le champ U_IsAdmin dans SAP B1.
 */
export const ADMIN_USER_CODES: readonly string[] = ['ADMIN', 'E.DOUEU'];
