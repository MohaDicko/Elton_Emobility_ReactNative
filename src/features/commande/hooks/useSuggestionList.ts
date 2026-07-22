import { useQuery } from '@tanstack/react-query';
import { N_WEEKS, N_WEEKS_COVERAGE } from '@core/config/constants';
import { useAuthStore } from '@core/auth/authStore';
import { commandeService } from '../services/commandeService';

export type SuggestionUrgency = 'urgent' | 'faible' | 'rupture';

export interface ISuggestionItem {
  itemCode: string;
  itemName: string;
  barCode: string | null;
  quantityOnStock: number;
  // Reste a livrer (QuantityOrderedFromVendors)
  ral: number;
  venteMoyenne: number;
  // stock / venteMoyenne ; null si venteMoyenne = 0
  couvertureSemaines: number | null;
  // max(0, ceil(venteMoyenne * N_WEEKS_COVERAGE - stock - ral))
  qteSuggeree: number;
  inventoryUOM: string;
  urgency: SuggestionUrgency;
  supplierCode: string; // DefaultVendorNumber SAP — '' si non configuré
}

const useSuggestionList = () => {
  const user = useAuthStore((s) => s.user);
  const scopedWarehouse = user?.isAdmin ? '' : (user?.warehouseCode ?? '');

  // 1 appel SQL global ou par magasin pour analyser les ventes
  const analysisQuery = useQuery({
    queryKey: ['invoice-analysis', N_WEEKS, scopedWarehouse || 'ALL'],
    queryFn: () => commandeService.getInvoiceAnalysis(N_WEEKS, scopedWarehouse || undefined),
    staleTime: 5 * 60 * 1000, // 5 min
  });

  const itemsQuery = useQuery({
    queryKey: ['items-low-stock'],
    queryFn: () => commandeService.getLowStockItems(200),
    staleTime: 2 * 60 * 1000, // 2 min
  });

  const isLoading = analysisQuery.isLoading || itemsQuery.isLoading;
  const error = (analysisQuery.error ?? itemsQuery.error) as Error | null;

  const suggestions: ISuggestionItem[] = (() => {
    if (!analysisQuery.data || !itemsQuery.data) return [];

    const { salesMap } = analysisQuery.data;
    const result: ISuggestionItem[] = [];

    for (const item of itemsQuery.data) {
      const stock = item.QuantityOnStock ?? 0;
      const ral = item.QuantityOrderedFromVendors ?? 0;
      const venteMoyenne = salesMap.get(item.ItemCode) ?? 0;

      // Couverture = (stock + RAL) / vente hebdo — RAL = articles commandés non reçus
      const couvertureSemaines =
        venteMoyenne > 0
          ? Math.max(0, Math.round(((stock + ral) / venteMoyenne) * 10) / 10)
          : null;

      const besoinBrut =
        venteMoyenne > 0
          ? venteMoyenne * N_WEEKS_COVERAGE - stock - ral
          : 0;
      const qteSuggeree = Math.max(0, Math.ceil(besoinBrut));

      const isRuptureSansHistorique = stock === 0 && venteMoyenne === 0;
      if (qteSuggeree === 0 && !isRuptureSansHistorique) continue;

      let urgency: SuggestionUrgency;
      if (isRuptureSansHistorique) {
        urgency = 'rupture';
      } else if (couvertureSemaines !== null && couvertureSemaines < 1) {
        urgency = 'urgent';
      } else {
        urgency = 'faible';
      }

      result.push({
        itemCode: item.ItemCode,
        itemName: item.ItemName,
        barCode: item.BarCode ?? null,
        quantityOnStock: stock,
        ral,
        venteMoyenne,
        couvertureSemaines,
        qteSuggeree,
        inventoryUOM: item.InventoryUOM ?? '',
        urgency,
        supplierCode: item.Mainsupplier ?? '',
      });
    }

    const urgencyOrder: Record<SuggestionUrgency, number> = {
      urgent: 0,
      faible: 1,
      rupture: 2,
    };
    result.sort((a, b) => {
      const uDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (uDiff !== 0) return uDiff;
      const aCoV = a.couvertureSemaines ?? Infinity;
      const bCoV = b.couvertureSemaines ?? Infinity;
      return aCoV - bCoV;
    });

    return result;
  })();

  const refetch = () => {
    analysisQuery.refetch();
    itemsQuery.refetch();
  };

  return { suggestions, isLoading, error, refetch };
};

export default useSuggestionList;
