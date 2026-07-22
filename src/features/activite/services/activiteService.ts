// ─── Service — Journal d'activité mobile (@GA_MOB_ACTIVITY) ─────────────────
// UDT SAP append-only — 1 ligne par document créé depuis l'app.
// Lecture via GET simple, écriture via POST.
// Avantage vs SQLQuery UNION : stable, pas de dialecte SQL à gérer, performances fixes.
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import type { IActiviteItem, IActivityLog } from '../types';

const MAX_KEY_LENGTH = 20;
const MAX_RETRIES = 3;

const buildUniqueKey = (): string => {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${ts}${rand}`.slice(0, MAX_KEY_LENGTH);
};

const isDuplicateEntryError = (error: unknown): boolean => {
  const code = (error as any)?.response?.data?.error?.code;
  const message = String((error as any)?.response?.data?.error?.message?.value ?? '');
  return code === -2035 || message.toLowerCase().includes('already exists');
};

/**
 * Écrit une ligne dans le journal.
 * TOUJOURS appeler en fire-and-forget : `.catch(() => {})` — ne jamais bloquer le flux métier.
 * Le Code/Name (clés SAP) sont générés ici — uniques pour éviter ODBC -2035.
 */
const logActivity = async (entry: IActivityLog): Promise<void> => {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const key = buildUniqueKey();
    const payload = {
      ...entry,
      Code: key,
      Name: key,
    };

    try {
      if (__DEV__) {
        console.log(`[logActivity] tentative ${attempt + 1}`, payload);
      }
      await apiClient.post(ENDPOINTS.GA_MOB_ACTIVITY, payload);
      return;
    } catch (error) {
      lastError = error;
      if (!isDuplicateEntryError(error) || attempt === MAX_RETRIES - 1) {
        throw error;
      }
    }
  }

  throw lastError;
};

/** Activité de l'utilisateur connecté (filtré par U_UtilisateurMob) */
const getMyActivite = async (userName: string): Promise<IActiviteItem[]> => {
  const { data } = await apiClient.get<{ value: IActiviteItem[] }>(
    ENDPOINTS.GA_MOB_ACTIVITY_BY_USER(userName)
  );
  return data.value ?? [];
};

/** Toutes les activités — réservé à l'admin */
const getAllActivite = async (): Promise<IActiviteItem[]> => {
  const { data } = await apiClient.get<{ value: IActiviteItem[] }>(
    ENDPOINTS.GA_MOB_ACTIVITY_ALL
  );
  return data.value ?? [];
};

export const activiteService = { logActivity, getMyActivite, getAllActivite };
