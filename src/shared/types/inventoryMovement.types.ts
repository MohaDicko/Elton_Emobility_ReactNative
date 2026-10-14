// ─── Types Entrée / Sortie de Marchandises ───────────────────────────────────

/** Ligne de mouvement de stock (commune à Entrée et Sortie) */
export interface IInventoryMovementLine {
  ItemCode: string;
  Quantity: number;
  WarehouseCode: string;
}

/** Sortie de marchandises SAP B1 — entité InventoryGenExits */
export interface IInventoryGenExit {
  DocEntry?: number;
  DocNum?: number;
  DocDate?: string;
  Comments?: string;
  U_TypeMouv?: string;
  /** Traçabilité — nom de l'utilisateur app qui a créé le document (UDF SAP) */
  U_UtilisateurMob?: string;
  DocumentLines: IInventoryMovementLine[];
}

