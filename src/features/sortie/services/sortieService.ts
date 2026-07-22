// ─── Service Sortie de Marchandises — API SAP B1 ─────────────────────────────
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import { useAuthStore } from '@core/auth/authStore';
import type { IInventoryGenExit, IInventoryMovementLine, ISapResponse } from '@shared/types';
import { buildInventoryGenExit } from '@shared/utils';

// ─── Fonctions API ───────────────────────────────────────────────────────────

/** Crée une sortie de marchandises (POST /InventoryGenExits) */
const createExit = async (
  lines: IInventoryMovementLine[],
  /** Motif SAP — UDF U_TypeMouv : CASSE | PERIME | ECONOMAT */
  motif: string,
  /** Commentaire libre — obligatoire côté app, stocké dans Comments SAP */
  commentaire?: string,
): Promise<IInventoryGenExit & { pendingApproval?: boolean }> => {
  const userName = useAuthStore.getState().user?.userName;
  const body = buildInventoryGenExit(lines, motif, userName, commentaire);
  try {
    const { data } = await apiClient.post<IInventoryGenExit>(
      ENDPOINTS.INVENTORY_GEN_EXITS,
      body
    );
    return data;
  } catch (error: any) {
    // SAP B1 déclenche un processus d'approbation → le document EST créé en base
    // mais SAP retourne une erreur selon la version :
    //   - HTTP 404 (certaines versions)
    //   - HTTP 400/500 avec code -2028 "No matching records found (ODBC -2028)" (autres versions)
    // Dans les deux cas : ce n'est pas une vraie erreur applicative, afficher "En attente d'approbation"
    const sapCode = error?.response?.data?.error?.code;
    const httpStatus = error?.response?.status;
    if (httpStatus === 404 || sapCode === -2028) {
      return { pendingApproval: true, DocumentLines: [] };
    }
    throw error;
  }
};

/** Liste des sorties récentes (30 dernières) */
const getRecentExits = async (): Promise<IInventoryGenExit[]> => {
  const { data } = await apiClient.get<ISapResponse<IInventoryGenExit>>(
    `${ENDPOINTS.INVENTORY_GEN_EXITS}?$top=30&$orderby=DocDate desc`
  );
  return data.value;
};

export const sortieService = {
  createExit,
  getRecentExits,
};
