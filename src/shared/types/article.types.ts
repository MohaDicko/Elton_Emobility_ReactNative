// ─── Types Articles SAP B1 — basés sur les champs confirmés du serveur ──────

/** Stock par entrepôt (extrait de ItemWarehouseInfoCollection — champs utiles uniquement) */
export interface IWarehouseStock {
  WarehouseCode: string;
  InStock: number;
  Committed: number;
  Ordered: number;
}

/** Article SAP B1 — entité Items */
export interface IArticle {
  ItemCode: string;
  ItemName: string;
  BarCode: string | null;
  ItemsGroupCode: number;
  QuantityOnStock: number;
  QuantityOrderedFromVendors: number;
  QuantityOrderedByCustomers: number;
  // ── Champs confirmés sur l'instance SAP client ──
  InventoryUOM: string;       // Unité de mesure d'inventaire ("Piece", "KG", "L"...)
  U_rayon: string | null;     // UDF Rayon ("EPICERIE SUCREE", "DPH"...)
  U_sous_fam: string | null;  // UDF Sous-Famille ("BISCUITS NAPPES"...)
  U_PCB: string | null;       // UDF PCB / colisage (string, peut être null)
  price?: number;             // Prix de vente extrait de ItemPrices (liste 1)
  Frozen?: 'tYES' | 'tNO';   // tYES = article inactif/bloqué dans SAP, tNO = actif
  Mainsupplier?: string | null; // CardCode du fournisseur principal SAP (OITM.Mainsupplier)
  // ────────────────────────────────────────────────
  ItemWarehouseInfoCollection?: IWarehouseStock[];
}

/** Code-barres SAP B1 — entité BarCodes (multi-barcodes par article) */
export interface IBarCode {
  AbsEntry: number;
  ItemNo: string;
  Barcode: string;
  FreeText: string | null;
  UoMEntry: number;
}

/** Famille d'articles SAP B1 — entité ItemGroups */
export interface IItemGroup {
  Number: number;
  GroupName: string;
}
