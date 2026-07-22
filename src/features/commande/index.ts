// ─── Module Commande — exports ───────────────────────────────────────────────
export { commandeService } from './services/commandeService';
export type { ISupplier } from './services/commandeService';
export { useOpenOrders, useCreateOrder, useCreateOrders, useSuppliers, useSupplierSearch, useSupplierByCode } from './hooks/useCommande';
export type { ISupplierGroup } from './hooks/useCommande';
export { default as useVentesHebdo } from './hooks/useVentesHebdo';
export { useCommandeStore } from './store/commandeStore';
export type { ICartItem } from './store/commandeStore';
