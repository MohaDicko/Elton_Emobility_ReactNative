// ─── Hook Réception — queries + mutation ─────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { receptionService } from '../services/receptionService';
import { useReceptionStore } from '../store/receptionStore';
import { useAuthStore } from '@core/auth/authStore';
import { isSapApprovalProcess, extractSapErrorMessage } from '@shared/utils';
import type { IPurchaseOrder, IPurchaseDeliveryNoteLine } from '@shared/types';
import { activiteService } from '@features/activite/services/activiteService';

// ─── Query : commandes ouvertes (pour la sélection) ─────────────────────────

export const useOpenOrdersForReception = (warehouseCode?: string) => {
  const normalizedWhs = (warehouseCode ?? '').trim().toUpperCase();
  return useQuery<IPurchaseOrder[]>({
    queryKey: ['reception', 'open-orders', normalizedWhs],
    queryFn: () => receptionService.getOpenOrders(normalizedWhs || undefined),
  });
};

// ─── Mutation : créer une réception ─────────────────────────────────────────

export const useCreateDeliveryNote = () => {
  const queryClient = useQueryClient();
  const clearReception = useReceptionStore((s) => s.clearReception);
  const userName = useAuthStore((s) => s.user?.userName ?? 'Inconnu');

  return useMutation({
    mutationFn: (params: {
      cardCode: string;
      lines: IPurchaseDeliveryNoteLine[];
    }) =>
      receptionService.createDeliveryNote(params.cardCode, params.lines, userName),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reception'] });
      queryClient.invalidateQueries({ queryKey: ['commandes'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      clearReception();
      Toast.show({
        type: 'success',
        text1: 'Réception validée',
        text2: 'La réception marchandises a été enregistrée',
      });
      // Journal d'activité — fire-and-forget
      activiteService.logActivity({
        Name: 'Réception marchandises',
        U_TypeDoc: 'Réception',
        U_DocNum: String(data.DocNum ?? ''),
        U_DocEntry: data.DocEntry ?? 0,
        U_DocDate: new Date().toISOString().slice(0, 10),
        U_Tiers: variables.cardCode,
        U_UtilisateurMob: userName,
      }).catch((e) => console.error('[logActivity réception]', e?.response?.data ?? e?.message));
    },
    onError: (error: Error, variables) => {
      if (isSapApprovalProcess(error)) {
        // Document créé en base SAP — bloqué par un workflow d'approbation
        queryClient.invalidateQueries({ queryKey: ['reception'] });
        queryClient.invalidateQueries({ queryKey: ['commandes'] });
        queryClient.invalidateQueries({ queryKey: ['stock'] });
        queryClient.invalidateQueries({ queryKey: ['kpis'] });
        clearReception();
        Toast.show({
          type: 'info',
          text1: 'En attente d\'approbation',
          text2: 'La réception a été soumise et attend une validation dans SAP',
        });
        activiteService.logActivity({
          Name: 'Réception marchandises',
          U_TypeDoc: 'Réception',
          U_DocNum: '',
          U_DocEntry: 0,
          U_DocDate: new Date().toISOString().slice(0, 10),
          U_Tiers: variables.cardCode,
          U_UtilisateurMob: userName,
        }).catch((e) => console.error('[logActivity réception approval]', e?.response?.data ?? e?.message));
        return;
      }
      Toast.show({
        type: 'error',
        text1: 'Erreur SAP',
        text2: extractSapErrorMessage(error),
      });
    },
  });
};
