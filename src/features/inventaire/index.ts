// ─── Module Inventaire — exports ─────────────────────────────────────────────
export { inventaireService } from './services/inventaireService';
export {
  useOpenCountings,
  useCountingDetail,
  useBinLocations,
  useWarehouseBins,
  useUpdateCountedLine,
  useAddCountedItem,
} from './hooks/useInventaire';
export { useInventaireStore } from './store/inventaireStore';
