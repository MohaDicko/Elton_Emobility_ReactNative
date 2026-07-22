// ─── Types Factures de Vente (calcul vente moyenne hebdo) ────────────────────

/** Ligne de facture de vente */
export interface IARInvoiceLine {
  ItemCode: string;
  Quantity: number;
  Price: number;
  LineTotal: number;
}

/** Facture de vente SAP B1 — entité ARInvoices */
export interface IARInvoice {
  DocEntry: number;
  DocDate: string;
  DocumentLines: IARInvoiceLine[];
}
