// ─── Hook Sortie — mutation POST /InventoryGenExits ──────────────────────────
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { sortieService } from '../services/sortieService';
import { useSortieStore } from '../store/sortieStore';
import { useAuthStore } from '@core/auth/authStore';
import { isSapApprovalProcess, extractSapErrorMessage } from '@shared/utils';
import type { IInventoryMovementLine } from '@shared/types';
import { activiteService } from '@features/activite/services/activiteService';

// ─── Mutation : créer une sortie de marchandises ─────────────────────────────

export const useCreateExit = () => {
  const queryClient = useQueryClient();
  const clearCart = useSortieStore((s) => s.clearCart);
  const userName = useAuthStore((s) => s.user?.userName ?? 'Inconnu');

  return useMutation({
    mutationFn: (params: { lines: IInventoryMovementLine[]; motif: string; commentaire?: string }) =>
      sortieService.createExit(params.lines, params.motif, params.commentaire),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sorties'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      clearCart();
      if (result.pendingApproval) {
        Toast.show({
          type: 'info',
          text1: 'En attente d\'approbation',
          text2: 'La sortie a été soumise et attend une validation dans SAP',
        });
      } else {
        Toast.show({
          type: 'success',
          text1: 'Sortie enregistrée',
          text2: 'La sortie de marchandises a été validée dans SAP',
        });
      }
      // Journal d'activité — fire-and-forget
      // result.DocNum absent si pendingApproval=true (retour synthétique sans DocNum)
      activiteService.logActivity({
        Name: `Sortie — ${variables.motif ?? 'AUTRE'}`,
        U_TypeDoc: 'Sortie',
        U_DocNum: String(result.DocNum ?? ''),
        U_DocEntry: result.DocEntry ?? 0,
        U_DocDate: new Date().toISOString().slice(0, 10),
        U_Tiers: variables.motif ?? '',
        U_UtilisateurMob: userName,
      }).catch((e) => console.error('[logActivity sortie]', e?.response?.data ?? e?.message));
    },
    onError: (error: Error) => {
      if (isSapApprovalProcess(error)) {
        queryClient.invalidateQueries({ queryKey: ['sorties'] });
        queryClient.invalidateQueries({ queryKey: ['kpis'] });
        clearCart();
        Toast.show({
          type: 'info',
          text1: 'En attente d\'approbation',
          text2: 'La sortie a été soumise et attend une validation dans SAP',
        });
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
