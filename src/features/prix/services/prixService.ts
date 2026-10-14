// ─── Service Gestion des Prix — API SAP B1 (Module 8) ─────────────────────────
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import { useAuthStore } from '@core/auth/authStore';
import { activiteService } from '@features/activite/services/activiteService';
import type { ISapResponse } from '@shared/types';
import type { IPriceList, IItemPriceEntry, IUpdatePricePayload } from '../types';

/** Récupère toutes les listes de prix configurées dans SAP B1 */
const getPriceLists = async (): Promise<IPriceList[]> => {
  try {
    const { data } = await apiClient.get<ISapResponse<IPriceList>>(ENDPOINTS.PRICE_LISTS);
    return data.value ?? [];
  } catch (error) {
    console.warn('[getPriceLists] Impossible de charger les listes de prix:', error);
    // Fallback de base si la route OData échoue en dev
    return [
      { PriceListNo: 1, PriceListName: 'Tarif Général Vente' },
      { PriceListNo: 2, PriceListName: 'Prix Vente Boutique' },
    ];
  }
};

/** Récupère les prix d'un article pour toutes les listes configurées */
const getItemPrices = async (itemCode: string): Promise<IItemPriceEntry[]> => {
  const { data } = await apiClient.get<{
    ItemPrices?: Array<{ PriceList: number; Price: number | null; Currency?: string }>;
  }>(ENDPOINTS.ITEM_BY_CODE_WITH_STOCK(itemCode));

  return (
    data.ItemPrices?.map((p) => ({
      PriceList: p.PriceList,
      Price: p.Price,
      Currency: p.Currency ?? 'XOF',
    })) ?? []
  );
};

/**
 * Met à jour le prix de vente d'un article pour une liste de prix donnée dans SAP B1
 * Requête standard SAP Service Layer : PATCH /Items('ItemCode')
 */
const updateItemPrice = async ({
  itemCode,
  priceList,
  newPrice,
}: IUpdatePricePayload): Promise<void> => {
  const userName = useAuthStore.getState().user?.userName ?? 'Utilisateur Mobile';

  // 1. Mise à jour dans SAP B1
  await apiClient.patch(ENDPOINTS.ITEM_BY_CODE(itemCode), {
    ItemPrices: [
      {
        PriceList: priceList,
        Price: newPrice,
      },
    ],
  });

  // 2. Traçabilité dans le journal d'activité mobile (fire-and-forget)
  activiteService
    .logActivity({
      Name: `Maj Prix — ${itemCode} : ${newPrice} F CFA`,
      U_TypeDoc: 'Prix',
      U_DocNum: String(priceList),
      U_DocEntry: 0,
      U_DocDate: new Date().toISOString().slice(0, 10),
      U_Tiers: `Liste de prix N°${priceList}`,
      U_UtilisateurMob: userName,
    })
    .catch((e) => console.error('[logActivity Maj Prix]', e?.response?.data ?? e?.message));
};

export const prixService = {
  getPriceLists,
  getItemPrices,
  updateItemPrice,
};
