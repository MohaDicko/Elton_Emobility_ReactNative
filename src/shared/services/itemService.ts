// ─── Service Articles SAP B1 ─────────────────────────────────────────────────
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import type { IArticle, IBarCode, IWarehouseStock, IItemGroup } from '@shared/types';
import type { ISapResponse } from '@shared/types';

// Liste de prix SAP utilisée pour les étiquettes de rayon
// Tests : liste 2 (prix vente public 1 200 XOF) | Production : liste 19
const LABEL_PRICE_LIST = 2;

const SUPPRESSION_FIELD_CANDIDATES = [
  'U_EnCoursSuppression',
  'U_EnCoursSupression',
  'U_EncoursSuppression',
  'U_EncoursSupression',
  'U_En_Cours_Suppression',
  'U_En_Cours_Supression',
  'U_DeleteInProgress',
] as const;

const isTruthyFlag = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toUpperCase();
  return ['Y', 'YES', 'OUI', 'TRUE', '1', 'TYES', 'T'].includes(normalized);
};

const isPendingDeletion = (article: Record<string, unknown>): boolean => {
  for (const key of SUPPRESSION_FIELD_CANDIDATES) {
    if (isTruthyFlag(article[key])) return true;
  }

  for (const [key, value] of Object.entries(article)) {
    const k = key.toLowerCase();
    if (
      (k.includes('suppression') || k.includes('supression') || k.includes('delete')) &&
      isTruthyFlag(value)
    ) {
      return true;
    }
  }

  return false;
};

const isVisibleForTransactions = (article: IArticle): boolean => {
  const raw = article as unknown as Record<string, unknown>;
  if (String(raw.Frozen ?? '').toUpperCase() === 'TYES') return false;
  if (isPendingDeletion(raw)) return false;
  return true;
};

/** Récupère un article par son ItemCode (avec stock par entrepôt + prix vente) */
const getByCode = async (code: string): Promise<IArticle> => {
  // Champ réel SAP = "PriceList" (pas "PriceListNum") — vérifié Postman 2026-03-18
  type IItemRaw = IArticle & {
    ItemPrices?: Array<{
      PriceList: number;
      Price: number | null; // null si liste non configurée côté SAP
    }>;
  };
  const { data } = await apiClient.get<IItemRaw>(ENDPOINTS.ITEM_BY_CODE_WITH_STOCK(code));
  const price = data.ItemPrices?.find((p) => p.PriceList === LABEL_PRICE_LIST)?.Price ?? 0;
  return { ...data, price };
};

/** Recherche d'articles par nom (startswith, max 15 résultats) */
const searchByName = async (term: string): Promise<IArticle[]> => {
  const { data } = await apiClient.get<ISapResponse<IArticle>>(ENDPOINTS.ITEMS_SEARCH(term));
  return data.value.filter(isVisibleForTransactions);
};

/** Recherche d'articles par code article (startswith, max 15 résultats) */
const searchByCode = async (term: string): Promise<IArticle[]> => {
  const { data } = await apiClient.get<ISapResponse<IArticle>>(ENDPOINTS.ITEMS_SEARCH_BY_CODE(term));
  return data.value.filter(isVisibleForTransactions);
};

/**
 * Recherche par code-barres — double stratégie :
 * 1. Filtre sur Items.BarCode (champ simple)
 * 2. Si vide → cherche dans l'entité BarCodes → récupère ItemNo → getByCode
 */
const searchByBarcode = async (barcode: string): Promise<IArticle | null> => {
  // Stratégie 1 : champ BarCode sur Items
  const { data: itemsResult } = await apiClient.get<ISapResponse<IArticle>>(
    ENDPOINTS.ITEMS_BY_BARCODE(barcode)
  );

  if (itemsResult.value.length > 0) {
    return itemsResult.value.find(isVisibleForTransactions) ?? null;
  }

  // Stratégie 2 : entité BarCodes séparée
  try {
    const { data: barcodeResult } = await apiClient.get<ISapResponse<IBarCode>>(
      ENDPOINTS.BARCODE_BY_VALUE(barcode)
    );

    if (barcodeResult.value.length > 0) {
      const article = await getByCode(barcodeResult.value[0].ItemNo);
      return isVisibleForTransactions(article) ? article : null;
    }
  } catch {
    // BarCodes entity peut ne pas exister — on ignore
    if (__DEV__) console.log('[itemService] BarCodes entity fallback failed');
  }

  return null;
};

/**
 * Récupère le stock par entrepôt pour un article
 * Filtre uniquement les entrepôts avec du mouvement
 */
const getStockByWarehouse = async (code: string): Promise<IWarehouseStock[]> => {
  const article = await getByCode(code);

  if (!article.ItemWarehouseInfoCollection) {
    return [];
  }

  return article.ItemWarehouseInfoCollection
    .filter((wh) => wh.InStock > 0 || wh.Committed > 0 || wh.Ordered > 0)
    .map(({ WarehouseCode, InStock, Committed, Ordered }) => ({
      WarehouseCode,
      InStock,
      Committed,
      Ordered,
    }));
};

/**
 * Récupère toutes les familles d'articles (ItemGroups)
 * Gère la pagination SAP (odata.nextLink) pour charger toutes les pages
 */
const getItemGroups = async (): Promise<IItemGroup[]> => {
  type IGroupPage = ISapResponse<IItemGroup> & { 'odata.nextLink'?: string };
  const allGroups: IItemGroup[] = [];

  // Première page
  const firstPage = await apiClient.get<IGroupPage>(ENDPOINTS.ITEM_GROUPS);
  allGroups.push(...firstPage.data.value.map((g) => ({ Number: g.Number, GroupName: g.GroupName })));

  // Pages suivantes via odata.nextLink
  let nextLink: string | undefined = firstPage.data['odata.nextLink'];
  while (nextLink) {
    const nextPage = await apiClient.get<IGroupPage>(nextLink);
    allGroups.push(...nextPage.data.value.map((g) => ({ Number: g.Number, GroupName: g.GroupName })));
    nextLink = nextPage.data['odata.nextLink'];
  }

  return allGroups;
};

export const itemService = {
  getByCode,
  searchByName,
  searchByCode,
  searchByBarcode,
  getStockByWarehouse,
  getItemGroups,
};
