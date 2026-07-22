// ─── Hook Commande — CRUD + mutation ─────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { commandeService, type ISupplier } from '../services/commandeService';
import type { IPurchaseOrder } from '@shared/types';
import { formatSapDate, extractSapErrorMessage } from '@shared/utils';
import { useCommandeStore, type ICartItem } from '../store/commandeStore';
import { useAuthStore } from '@core/auth/authStore';
import { activiteService } from '@features/activite/services/activiteService';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ISupplierGroup {
  supplierCode: string;
  supplierName: string;
  items: ICartItem[];
}

// ─── Query : commandes ouvertes ──────────────────────────────────────────────

export const useOpenOrders = () => {
  return useQuery<IPurchaseOrder[]>({
    queryKey: ['commandes', 'open'],
    queryFn: commandeService.getOpenOrders,
  });
};

// ─── Query : fournisseurs ────────────────────────────────────────────────────

export const useSuppliers = () => {
  return useQuery<ISupplier[]>({
    queryKey: ['suppliers'],
    queryFn: commandeService.getSuppliers,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
};

/**
 * Recherche serveur de fournisseurs — déclenchée dès 2 caractères saisis.
 * Contourne la pagination SAP : même un fournisseur hors du top 500 est trouvable.
 * Résultats mis en cache 2 min par terme de recherche.
 */
export const useSupplierSearch = (term: string) => {
  return useQuery<ISupplier[]>({
    queryKey: ['suppliers-search', term],
    queryFn: () => commandeService.searchSuppliers(term),
    enabled: term.trim().length >= 2,
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev, // évite le flash vide entre deux termes
  });
};

/**
 * Résout le CardName d'un fournisseur à partir de son CardCode (Mainsupplier).
 * Déclenché uniquement quand `code` est défini — 1 appel par code unique, mis en cache 10 min.
 * Plus fiable que de dépendre du chargement de la liste complète des fournisseurs.
 */
export const useSupplierByCode = (code: string | null | undefined) => {
  return useQuery<ISupplier>({
    queryKey: ['supplier', code],
    queryFn: () => commandeService.getSupplierByCode(code!),
    enabled: !!code,
    staleTime: 10 * 60 * 1000, // 10 min — un fournisseur ne change pas souvent
  });
};

// ─── Mutation : créer une commande ───────────────────────────────────────────

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  const clearCart = useCommandeStore((s) => s.clearCart);
  const userName = useAuthStore((s) => s.user?.userName ?? 'Inconnu');

  return useMutation({
    mutationFn: (params: {
      cardCode: string;
      lines: { ItemCode: string; Quantity: number; WarehouseCode: string }[];
    }) => {
      // Commentaire automatique : traçabilité origine mobile + utilisateur
      const today = new Date().toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
      const comments = `Créé via GlobalAction Mobile | Utilisateur : ${userName} | ${today}`;

      return commandeService.createOrder({
        CardCode: params.cardCode,
        DocDate: formatSapDate(),
        Comments: comments,
        U_UtilisateurMob: userName,
        DocumentLines: params.lines,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['commandes'] });
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      clearCart();
      Toast.show({
        type: 'success',
        text1: 'Commande créée',
        text2: `BC n°${data.DocNum ?? data.DocEntry} envoyé vers SAP`,
      });
      // Journal d'activité — fire-and-forget, ne bloque pas le flux
      activiteService.logActivity({
        Name: `Commande #${data.DocNum ?? ''}`,
        U_TypeDoc: 'Commande',
        U_DocNum: String(data.DocNum ?? ''),
        U_DocEntry: data.DocEntry ?? 0,
        U_DocDate: new Date().toISOString().slice(0, 10),
        U_Tiers: variables.cardCode,
        U_UtilisateurMob: userName,
      }).catch((e) => console.error('[logActivity commande]', e?.response?.data ?? e?.message));
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Erreur SAP',
        text2: extractSapErrorMessage(error),
      });
    },
  });
};

// ─── Mutation : créer N commandes (1 par fournisseur) ────────────────────────

export const useCreateOrders = () => {
  const queryClient = useQueryClient();
  const clearCart = useCommandeStore((s) => s.clearCart);
  const userName = useAuthStore((s) => s.user?.userName ?? 'Inconnu');

  return useMutation({
    mutationFn: async (groups: ISupplierGroup[]) => {
      const today = new Date().toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

      // Promise.allSettled → tous les BF tentés même si l'un échoue
      const results = await Promise.allSettled(
        groups.map((g) =>
          commandeService.createOrder({
            CardCode: g.supplierCode,
            DocDate: formatSapDate(),
            Comments: `Créé via GlobalAction Mobile | Utilisateur : ${userName} | ${today}`,
            U_UtilisateurMob: userName,
            DocumentLines: g.items.map((i) => ({
              ItemCode: i.itemCode,
              Quantity: i.quantity,
              WarehouseCode: i.warehouseCode,
            })),
          })
        )
      );

      return results;
    },

    onSuccess: (results, groups) => {
      queryClient.invalidateQueries({ queryKey: ['commandes'] });
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      clearCart();

      const successes = results.filter((r) => r.status === 'fulfilled');
      const failures = results.filter((r) => r.status === 'rejected');

      // Journal d'activité — 1 entrée par commande créée (fire-and-forget)
      results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          const data = result.value;
          activiteService.logActivity({
            Name: `Commande #${data.DocNum ?? ''}`,
            U_TypeDoc: 'Commande',
            U_DocNum: String(data.DocNum ?? ''),
            U_DocEntry: data.DocEntry ?? 0,
            U_DocDate: new Date().toISOString().slice(0, 10),
            U_Tiers: groups[i].supplierCode,
            U_UtilisateurMob: userName,
          }).catch((e) => console.error('[logActivity commande]', e?.response?.data ?? e?.message));
        }
      });

      if (failures.length === 0) {
        Toast.show({
          type: 'success',
          text1: `${successes.length} commande${successes.length > 1 ? 's' : ''} créée${successes.length > 1 ? 's' : ''} ✅`,
          text2: successes.length > 1 ? `${successes.length} bons de commande envoyés vers SAP` : undefined,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: `${successes.length} OK · ${failures.length} échouée${failures.length > 1 ? 's' : ''}`,
          text2: 'Vérifiez les commandes en erreur dans SAP',
        });
      }
    },

    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Erreur SAP',
        text2: extractSapErrorMessage(error),
      });
    },
  });
};
