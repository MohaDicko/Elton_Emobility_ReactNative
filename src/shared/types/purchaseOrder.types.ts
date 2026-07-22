// ─── Types Commandes Fournisseurs + Réception ────────────────────────────────
import type { DocumentStatusT } from './sap.types';

/** Ligne de commande fournisseur (PurchaseOrderLine) */
export interface IPurchaseOrderLine {
  LineNum: number;
  ItemCode: string;
  ItemDescription: string;
  Quantity: number;
  Price: number;
  WarehouseCode: string;
  DeliveredQuantity?: number; // SAP omet ce champ quand = 0
  RemainingOpenQuantity: number;
}

/** Commande fournisseur SAP B1 — entité PurchaseOrders */
export interface IPurchaseOrder {
  DocEntry: number;
  DocNum: number;
  CardCode: string;
  CardName: string;
  DocDate: string;
  DocDueDate?: string;  // Date de livraison prévue
  DocTotal?: number;
  NumAtCard?: string;   // Référence fournisseur (n° de commande chez le fournisseur)
  Comments?: string;    // Remarques libres du BC
  DocumentStatus: DocumentStatusT;
  DocumentLines: IPurchaseOrderLine[];
}

/** Ligne de réception (PurchaseDeliveryNoteLine) — basée sur un BC existant */
export interface IPurchaseDeliveryNoteLine {
  ItemCode: string;
  Quantity: number;
  WarehouseCode: string;
  BaseType: 22;
  BaseEntry: number;
  BaseLine: number;
}

/** Réception marchandises SAP B1 — entité PurchaseDeliveryNotes */
export interface IPurchaseDeliveryNote {
  CardCode: string;
  DocDate?: string;
  DocNum?: number;    // Retourné par SAP dans la réponse POST (numéro du document créé)
  DocEntry?: number;  // Retourné par SAP dans la réponse POST
  /** Remarques libres — override des commentaires copiés du BC parent */
  Comments?: string;
  /** Traçabilité — nom de l'utilisateur app qui a créé le document (UDF SAP) */
  U_UtilisateurMob?: string;
  DocumentLines: IPurchaseDeliveryNoteLine[];
}
