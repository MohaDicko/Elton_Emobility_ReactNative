// ─── Types communs SAP Service Layer ─────────────────────────────────────────

/** Statut de document SAP B1 */
export type DocumentStatusT = 'bost_Open' | 'bost_Close' | 'bost_Paid' | 'bost_Delivered';

/** Enveloppe OData pour les collections SAP */
export interface ISapResponse<T> {
  'odata.metadata'?: string;
  value: T[];
}

/** Structure d'erreur SAP Service Layer */
export interface ISapError {
  error: {
    code: string;
    message: {
      lang: string;
      value: string;
    };
  };
}

/** Paramètres OData pour les requêtes SAP */
export interface ISapODataParams {
  $filter?: string;
  $select?: string;
  $expand?: string;
  $top?: number;
  $skip?: number;
  $orderby?: string;
}
