// ─── Hook Ventes Hebdo + Suggestion pour un article ──────────────────────────
import { useQuery } from '@tanstack/react-query';
import { N_WEEKS, N_WEEKS_COVERAGE } from '@core/config/constants';
import { commandeService } from '../services/commandeService';

interface IVentesHebdoResult {
  venteMoyenne: number;
  totalVendu: number;
  /** Reste À Livrer — issu de QuantityOrderedFromVendors (déjà dans Items, 0 appel réseau) */
  ral: number;
  /** Couverture actuelle en semaines = stock / venteMoyenne. null si venteMoyenne = 0 */
  couvertureSemaines: number | null;
  /** Quantité suggérée = max(0, venteMoyenne × N_WEEKS_COVERAGE - stock - RAL) */
  qteSuggeree: number;
  /** Nombre de factures analysées (affiché en indicateur d'approximation) */
  invoicesFetched: number;
  /** Nombre de semaines calendaires couverts par la fenêtre de calcul (= N_WEEKS) */
  periodeWeeks: number;
  /** Toujours true — vente calculée sur un sous-ensemble de factures récentes */
  isApproximatif: boolean;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Récupère les ventes hebdo moyennes + calcule suggestion de commande.
 * @param itemCode — code article SAP
 * @param quantityOnStock — stock global actuel (QuantityOnStock depuis Items)
 * @param ral — Reste À Livrer (QuantityOrderedFromVendors depuis Items — 0 appel réseau)
 */
const useVentesHebdo = (
  itemCode: string,
  quantityOnStock: number = 0,
  ral: number = 0,
  warehouseCode?: string,
): IVentesHebdoResult => {
  const salesQuery = useQuery({
    queryKey: ['ventes-hebdo', itemCode, warehouseCode ?? 'ALL'],
    queryFn: () => commandeService.getWeeklySales(itemCode, N_WEEKS, warehouseCode),
    enabled: itemCode.length > 0,
    staleTime: 2 * 60 * 1000, // 2 min cache
  });

  const venteMoyenne = salesQuery.data?.venteMoyenne ?? 0;
  const totalVendu = salesQuery.data?.totalVendu ?? 0;
  const invoicesFetched = salesQuery.data?.invoicesFetched ?? 0;
  const periodeWeeks = salesQuery.data?.periodeWeeks ?? N_WEEKS;
  const isApproximatif = salesQuery.data?.isApproximatif ?? false;

  // Couverture = combien de semaines (stock + articles non réceptionnés) peut couvrir
  // RAL (QuantityOrderedFromVendors) inclus : marchandise commandée mais pas encore arrivée
  // null = pas de données de vente (vente/sem = 0) → on ne peut pas calculer
  const couvertureSemaines: number | null =
    venteMoyenne > 0
      ? Math.max(0, Math.round(((quantityOnStock + ral) / venteMoyenne) * 10) / 10)
      : null;

  // Suggestion = besoin pour N semaines - ce qu'on a déjà (stock + en cours de livraison)
  // Si pas de données de vente (venteMoyenne = 0) → on ne suggère rien (0)
  const besoinBrut = venteMoyenne > 0
    ? venteMoyenne * N_WEEKS_COVERAGE - quantityOnStock - ral
    : 0;
  const qteSuggeree = Math.max(0, Math.ceil(besoinBrut));

  return {
    venteMoyenne,
    totalVendu,
    ral,
    couvertureSemaines,
    qteSuggeree,
    invoicesFetched,
    periodeWeeks,
    isApproximatif,
    isLoading: salesQuery.isLoading,
    error: salesQuery.error as Error | null,
  };
};

export default useVentesHebdo;
