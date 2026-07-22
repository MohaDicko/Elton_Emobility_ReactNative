// ─── Service Commande Fournisseur — API SAP B1 ──────────────────────────────
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import { N_WEEKS } from '@core/config/constants';
import { getWeekRange } from '@shared/utils';
import type { IArticle, IPurchaseOrder, ISapResponse } from '@shared/types';

// ─── Constantes internes ─────────────────────────────────────────────────────

/** Nombre de factures récentes à charger pour le calcul de vente hebdo */
const INVOICE_HEADERS_TOP = 80;
/** Taille des lots pour les appels parallèles (GET /Invoices(X)) */
const BATCH_SIZE = 10;

// ─── Types internes ──────────────────────────────────────────────────────────

export interface ISupplier {
  CardCode: string;
  CardName: string;
}

interface ICreateOrderPayload {
  CardCode: string;
  DocDate: string;
  /** Remarques visibles dans SAP (onglet Logistique du BC) */
  Comments?: string;
  /** Traçabilité — nom de l'utilisateur app qui a créé le BC (UDF SAP) */
  U_UtilisateurMob?: string;
  DocumentLines: {
    ItemCode: string;
    Quantity: number;
    WarehouseCode: string;
  }[];
}

interface IInvoiceHeader {
  DocEntry: number;
  DocDate: string;
}

interface IInvoiceDetail {
  DocEntry: number;
  DocDate: string;
  DocumentLines?: Array<{ ItemCode: string; Quantity: number }>;
}

export interface IWeeklySalesResult {
  venteMoyenne: number;
  totalVendu: number;
  periodeWeeks: number;
  /** Nombre de factures effectivement chargées (peut être < INVOICE_HEADERS_TOP si erreurs) */
  invoicesFetched: number;
  /** Toujours vrai — la vente est calculée sur un sous-ensemble de factures */
  isApproximatif: boolean;
}

const escapeSqlParam = (value: string): string => value.replace(/'/g, "''");

// ─── Fonctions API ───────────────────────────────────────────────────────────

/** Liste des commandes fournisseur ouvertes */
const getOpenOrders = async (): Promise<IPurchaseOrder[]> => {
  const { data } = await apiClient.get<ISapResponse<IPurchaseOrder>>(
    ENDPOINTS.PURCHASE_ORDERS_OPEN
  );
  return data.value;
};

/** Détail d'une commande fournisseur avec ses lignes */
const getOrderDetail = async (docEntry: number): Promise<IPurchaseOrder> => {
  const { data } = await apiClient.get<IPurchaseOrder>(
    ENDPOINTS.PURCHASE_ORDER_DETAIL(docEntry)
  );
  return data;
};

/** Crée une nouvelle commande fournisseur (POST /PurchaseOrders) */
const createOrder = async (payload: ICreateOrderPayload): Promise<IPurchaseOrder> => {
  const { data } = await apiClient.post<IPurchaseOrder>(
    ENDPOINTS.PURCHASE_ORDERS,
    payload
  );
  return data;
};

/**
 * Liste complète des fournisseurs.
 * SAP B1 peut avoir un MaxPageSize serveur (souvent 20) qui ignore le $top OData.
 * On suit les odata.nextLink jusqu'à épuisement pour garantir la liste complète.
 * Max 25 pages (500 fournisseurs) — garde-fou contre une boucle infinie.
 */
const getSuppliers = async (): Promise<ISupplier[]> => {
  const allSuppliers: ISupplier[] = [];
  let nextUrl: string | null = ENDPOINTS.SUPPLIERS;
  let pageCount = 0;
  const MAX_PAGES = 25;

  while (nextUrl && pageCount < MAX_PAGES) {
    const { data } = await apiClient.get<ISapResponse<ISupplier> & { 'odata.nextLink'?: string }>(nextUrl);
    allSuppliers.push(...data.value);

    const raw = data['odata.nextLink'] ?? null;
    if (raw) {
      // SAP retourne un chemin relatif sans "/" initial (ex: "BusinessPartners?$skip=20")
      // Axios baseURL = ".../b1s/v1" → il faut le "/" pour éviter la concaténation incorrecte
      nextUrl = raw.startsWith('/') || raw.startsWith('http') ? raw : `/${raw}`;
    } else {
      nextUrl = null;
    }
    pageCount++;
  }

  return allSuppliers;
};

/**
 * Recherche serveur de fournisseurs par nom ou code.
 * Appelée quand l'utilisateur tape dans le champ de recherche du sélecteur.
 * substringof → trouve les occurrences partout dans la chaîne (pas seulement au début).
 */
const searchSuppliers = async (term: string): Promise<ISupplier[]> => {
  const { data } = await apiClient.get<ISapResponse<ISupplier>>(
    ENDPOINTS.SUPPLIERS_SEARCH(term)
  );
  return data.value;
};

/**
 * Récupère le nom d'un fournisseur à partir de son CardCode.
 * Utilisé pour résoudre le Mainsupplier d'un article sans attendre
 * le chargement de toute la liste des fournisseurs.
 * GET /BusinessPartners('code') — sans $select, lignes non nécessaires.
 */
const getSupplierByCode = async (code: string): Promise<ISupplier> => {
  const { data } = await apiClient.get<{ CardCode: string; CardName: string } & Record<string, unknown>>(
    ENDPOINTS.SUPPLIER_BY_CODE(code)
  );
  return { CardCode: data.CardCode, CardName: data.CardName };
};

/**
 * Calcule la vente moyenne hebdomadaire d'un article via SQLQueries SAP.
 * Remplace le batch de 80+ appels OData par 1 seul appel SQL (GA_VENTES_ARTICLE).
 */
const getWeeklySales = async (
  itemCode: string,
  nWeeks: number = N_WEEKS,
  warehouseCode?: string,
): Promise<IWeeklySalesResult> => {
  const { dateFrom, dateTo } = getWeekRange(nWeeks);
  const safeItemCode = escapeSqlParam(itemCode);
  const safeWhs = (warehouseCode ?? '').trim().toUpperCase();

  const runGlobal = () =>
    apiClient.post<{ value: Array<{ TotalVendu: number }> }>(
      ENDPOINTS.SQL_VENTES_ARTICLE,
      { ParamList: `StartDate='${dateFrom}'&EndDate='${dateTo}'&ItemCode='${safeItemCode}'` }
    );
  const runByWarehouse = () =>
    apiClient.post<{ value: Array<{ TotalVendu: number }> }>(
      ENDPOINTS.SQL_VENTES_ARTICLE_WHS,
      {
        ParamList:
          `StartDate='${dateFrom}'&EndDate='${dateTo}'` +
          `&ItemCode='${safeItemCode}'&WhsCode='${escapeSqlParam(safeWhs)}'`,
      }
    );

  let data: { value: Array<{ TotalVendu: number }> };
  if (safeWhs) {
    try {
      const res = await runByWarehouse();
      data = res.data;
    } catch {
      const res = await runGlobal();
      data = res.data;
    }
  } else {
    const res = await runGlobal();
    data = res.data;
  }

  const totalVendu = data.value[0]?.TotalVendu ?? 0;
  const venteMoyenne = nWeeks > 0
    ? Math.round((totalVendu / nWeeks) * 100) / 100
    : 0;

  return {
    venteMoyenne,
    totalVendu,
    periodeWeeks: nWeeks,
    invoicesFetched: 1,
    isApproximatif: false,
  };
};

// Note : getRAL() supprimé — QuantityOrderedFromVendors est déjà dans la réponse Items
// GET /Items('CODE') retourne ce champ nativement, zéro appel réseau supplémentaire.

// ─── Aide à la commande ───────────────────────────────────────────────────────

export interface IInvoiceAnalysis {
  /** Map itemCode → vente moyenne hebdomadaire sur nWeeks semaines */
  salesMap: Map<string, number>;
  invoicesFetched: number;
  periodeWeeks: number;
}

/**
 * Charge les ventes en UN SEUL appel SQL via SQLQueries SAP Service Layer.
 * Remplace le batch de 81 appels OData par POST /SQLQueries('GA_VENTES_HEBDO')/List.
 * La query GA_VENTES_HEBDO doit exister dans SAP (créée via Postman).
 */
const getInvoiceAnalysis = async (
  nWeeks: number = N_WEEKS,
  warehouseCode?: string,
): Promise<IInvoiceAnalysis> => {
  const { dateFrom, dateTo } = getWeekRange(nWeeks);
  const safeWhs = (warehouseCode ?? '').trim().toUpperCase();

  const runGlobal = () =>
    apiClient.post<{ value: Array<{ ItemCode: string; TotalVendu: number }> }>(
      ENDPOINTS.SQL_VENTES_HEBDO,
      { ParamList: `StartDate='${dateFrom}'&EndDate='${dateTo}'` }
    );
  const runByWarehouse = () =>
    apiClient.post<{ value: Array<{ ItemCode: string; TotalVendu: number }> }>(
      ENDPOINTS.SQL_VENTES_HEBDO_WHS,
      { ParamList: `StartDate='${dateFrom}'&EndDate='${dateTo}'&WhsCode='${escapeSqlParam(safeWhs)}'` }
    );

  const { data } = safeWhs
    ? await runByWarehouse().catch(() => runGlobal())
    : await runGlobal();

  const salesMap = new Map<string, number>();
  data.value.forEach((row) => {
    salesMap.set(row.ItemCode, Math.round((row.TotalVendu / nWeeks) * 100) / 100);
  });

  return { salesMap, invoicesFetched: data.value.length, periodeWeeks: nWeeks };
};

/**
 * Articles actifs (Frozen=tNO) triés par stock croissant — base de la liste de suggestions.
 * Retourne jusqu'à `top` articles (200 par défaut).
 */
const getLowStockItems = async (top = 200): Promise<IArticle[]> => {
  const { data } = await apiClient.get<ISapResponse<IArticle>>(
    ENDPOINTS.ITEMS_LOW_STOCK(top)
  );
  return data.value;
};

export const commandeService = {
  getOpenOrders,
  getOrderDetail,
  createOrder,
  getSuppliers,
  searchSuppliers,
  getSupplierByCode,
  getWeeklySales,
  getInvoiceAnalysis,
  getLowStockItems,
};
