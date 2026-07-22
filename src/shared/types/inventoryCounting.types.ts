// ─── Types Inventaire (Comptage + Validation) ────────────────────────────────
// Champs validés Postman le 2026-05-14 sur /InventoryCountings

/** Ligne de comptage d'inventaire */
export interface IInventoryCountingLine {
  DocumentEntry: number;
  LineNumber: number;           // requis pour le PATCH
  ItemCode: string;
  ItemDescription: string;
  WarehouseCode: string;
  /** AbsEntry de BinLocations — null si emplacements désactivés sur cet entrepôt */
  BinEntry: number | null;
  Counted: 'tYES' | 'tNO';
  CountedQuantity: number;
  InWarehouseQuantity: number;
  Variance: number;
  BarCode: string | null;
  UoMCode?: string;
}

/** Session de comptage d'inventaire SAP B1 — entité InventoryCountings
 * NOTE : SAP B1 utilise DocumentEntry (pas DocEntry) pour InventoryCountings */
export interface IInventoryCounting {
  DocumentEntry: number;
  DocumentNumber: number;
  CountDate: string;
  /** 'cdsOpen' = En attente | 'cdsClosed' = Clôturé — confirmé Postman */
  DocumentStatus: 'cdsOpen' | 'cdsClosed';
  U_UtilisateurMob?: string | null;
  InventoryCountingLines: IInventoryCountingLine[];
}

/** Emplacement (Bin Location) — résolution BinEntry → code lisible */
export interface IBinLocation {
  AbsEntry: number;
  BinCode: string;
}

/** Article compté à ajouter au document (nouvelle ligne — sans LineNumber, SAP l'assigne) */
export interface IAddCountedItemPayload {
  ItemCode: string;
  WarehouseCode: string;
  /** Omis si le magasin n'a pas d'emplacements configurés */
  BinEntry?: number;
  CountedQuantity: number;
  Counted: 'tYES';
}

/** Ligne de validation d'inventaire (posting) */
export interface IInventoryPostingLine {
  ItemCode: string;
  WarehouseCode: string;
  CountedQuantity: number;
}

/** Validation d'inventaire SAP B1 — entité InventoryPostings */
export interface IInventoryPosting {
  CountingID: number;
  InventoryPostingLines: IInventoryPostingLine[];
}
