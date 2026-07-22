import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import type {
  IBinLocation,
  IInventoryCounting,
  IInventoryCountingLine,
  ISapResponse,
} from '@shared/types';

const toIsoDate = (raw: string): string =>
  /^\d{8}$/.test(raw)
    ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
    : raw;

type ISapPage<T> = ISapResponse<T> & { 'odata.nextLink'?: string };
type IInventoryCountingRaw = IInventoryCounting & {
  'InventoryCountingLines@odata.nextLink'?: string;
};

const INVENTORY_COUNTING_LINES_PAGE_SIZE = 200;
const BIN_FILTER_CHUNK_SIZE = 40;
const PLACEHOLDER_ITEM_CODES = new Set(['A09541']);
const INVENTORY_COUNTING_PATCH_CONFIG = {
  headers: { 'B1S-ReplaceCollectionsOnPatch': 'true' },
};

const isPlaceholderLine = (line: IInventoryCountingLine): boolean =>
  PLACEHOLDER_ITEM_CODES.has(line.ItemCode);

const normalizeSapNextLink = (nextLink: string): string => {
  if (/^https?:\/\//i.test(nextLink) || nextLink.startsWith('/')) return nextLink;
  return `/${nextLink}`;
};

const countingLinesUrl = (docEntry: number, skip: number): string =>
  `/InventoryCountings(${docEntry})/InventoryCountingLines?` +
  '$select=DocumentEntry,LineNumber,ItemCode,ItemDescription,WarehouseCode,BinEntry,Counted,CountedQuantity,InWarehouseQuantity,Variance,BarCode,UoMCode' +
  `&$orderby=LineNumber&$top=${INVENTORY_COUNTING_LINES_PAGE_SIZE}&$skip=${skip}`;

const appendUniqueLines = (
  target: IInventoryCountingLine[],
  seen: Set<number>,
  lines: IInventoryCountingLine[]
): number => {
  let added = 0;
  lines.forEach((line) => {
    if (!seen.has(line.LineNumber)) {
      seen.add(line.LineNumber);
      target.push(line);
      added += 1;
    }
  });
  return added;
};

const fetchCountingLinesByNavigation = async (
  docEntry: number
): Promise<IInventoryCountingLine[]> => {
  const lines: IInventoryCountingLine[] = [];
  const seen = new Set<number>();
  let skip = 0;
  let nextUrl: string | null = countingLinesUrl(docEntry, skip);

  while (nextUrl) {
    const response = await apiClient.get<ISapPage<IInventoryCountingLine>>(nextUrl);
    const page = response.data;
    const added = appendUniqueLines(lines, seen, page.value);
    const nextLink = page['odata.nextLink'];

    if (nextLink) {
      nextUrl = normalizeSapNextLink(nextLink);
    } else if (page.value.length === INVENTORY_COUNTING_LINES_PAGE_SIZE && added > 0) {
      skip += INVENTORY_COUNTING_LINES_PAGE_SIZE;
      nextUrl = countingLinesUrl(docEntry, skip);
    } else {
      nextUrl = null;
    }
  }

  return lines.sort((a, b) => a.LineNumber - b.LineNumber);
};

const fetchCountingLinesFromInlineNextLink = async (
  firstLines: IInventoryCountingLine[],
  firstNextLink?: string
): Promise<IInventoryCountingLine[]> => {
  const lines: IInventoryCountingLine[] = [];
  const seen = new Set<number>();
  appendUniqueLines(lines, seen, firstLines);

  let nextUrl: string | null = firstNextLink ? normalizeSapNextLink(firstNextLink) : null;
  while (nextUrl) {
    const response = await apiClient.get<ISapPage<IInventoryCountingLine>>(nextUrl);
    const page = response.data;
    appendUniqueLines(lines, seen, page.value);
    nextUrl = page['odata.nextLink'] ? normalizeSapNextLink(page['odata.nextLink']) : null;
  }

  return lines.sort((a, b) => a.LineNumber - b.LineNumber);
};

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
};

const getCountings = async (warehouseCode?: string): Promise<IInventoryCounting[]> => {
  if (!warehouseCode) {
    const { data } = await apiClient.get<ISapResponse<IInventoryCounting>>(
      ENDPOINTS.INVENTORY_COUNTINGS_OPEN
    );
    return data.value;
  }

  const escaped = warehouseCode.replace(/'/g, "''");
  const { data } = await apiClient.post<{ value: Array<Record<string, unknown>> }>(
    ENDPOINTS.SQL_INV_OPEN_LIST_WHS,
    { ParamList: `WhsCode='${escaped}'` }
  );
  return data.value
    .map((row) => ({
      DocumentEntry: Number(row.DocumentEntry),
      DocumentNumber: Number(row.DocumentNumber),
      CountDate: toIsoDate(String(row.CountDate ?? '')),
      DocumentStatus: 'cdsOpen' as const,
      InventoryCountingLines: [],
    }))
    .sort((a, b) => b.CountDate.localeCompare(a.CountDate));
};

const getCountingDetail = async (docEntry: number): Promise<IInventoryCounting> => {
  const { data } = await apiClient.get<IInventoryCountingRaw>(
    ENDPOINTS.INVENTORY_COUNTING_DETAIL(docEntry)
  );

  try {
    const lines = await fetchCountingLinesByNavigation(docEntry);
    if (lines.length > 0 || (data.InventoryCountingLines ?? []).length === 0) {
      return { ...data, InventoryCountingLines: lines };
    }
  } catch {
    // Some SAP Service Layer versions reject collection navigation on document lines.
  }

  const lines = await fetchCountingLinesFromInlineNextLink(
    data.InventoryCountingLines ?? [],
    data['InventoryCountingLines@odata.nextLink']
  );
  return { ...data, InventoryCountingLines: lines };
};

const getBinLocations = async (binEntries: number[]): Promise<Map<number, string>> => {
  const uniqueEntries = [...new Set(binEntries)];
  const map = new Map<number, string>();
  if (uniqueEntries.length === 0) return map;

  for (const entries of chunk(uniqueEntries, BIN_FILTER_CHUNK_SIZE)) {
    const filter = entries.map((e) => `AbsEntry eq ${e}`).join(' or ');
    const { data } = await apiClient.get<ISapResponse<IBinLocation>>(
      `/BinLocations?$filter=${filter}&$select=AbsEntry,BinCode`
    );
    data.value.forEach((b) => map.set(b.AbsEntry, b.BinCode));
  }

  return map;
};

const updateCountedLine = async (
  docEntry: number,
  lineNumber: number,
  quantity: number
): Promise<void> => {
  const doc = await getCountingDetail(docEntry);
  const lines = doc.InventoryCountingLines
    .filter((l) => !isPlaceholderLine(l))
    .map((l) =>
      l.LineNumber === lineNumber
        ? { LineNumber: l.LineNumber, CountedQuantity: quantity, Counted: 'tYES' as const }
        : { LineNumber: l.LineNumber }
    );

  await apiClient.patch(`/InventoryCountings(${docEntry})`, {
    InventoryCountingLines: lines,
  }, INVENTORY_COUNTING_PATCH_CONFIG);
};

const getBinLocationsForWarehouse = async (
  warehouseCode: string
): Promise<IBinLocation[]> => {
  const escaped = warehouseCode.replace(/'/g, "''");
  const bins: IBinLocation[] = [];
  let nextUrl: string | null =
    `/BinLocations?$filter=Warehouse eq '${escaped}'&$select=AbsEntry,BinCode&$orderby=BinCode&$top=200`;

  while (nextUrl) {
    const currentUrl = nextUrl;
    const response = await apiClient.get<ISapPage<IBinLocation>>(currentUrl);
    const page: ISapPage<IBinLocation> = response.data;
    bins.push(...page.value);
    nextUrl = page['odata.nextLink'] ? normalizeSapNextLink(page['odata.nextLink']) : null;
  }

  return bins;
};

const addCountedItem = async (
  docEntry: number,
  item: { itemCode: string; quantity: number; binEntry?: number; warehouseCode: string }
): Promise<void> => {
  const doc = await getCountingDetail(docEntry);
  const keptLines = doc.InventoryCountingLines
    .filter((l) => !isPlaceholderLine(l))
    .map((l) => ({ LineNumber: l.LineNumber }));

  const newLine: Record<string, unknown> = {
    ItemCode: item.itemCode,
    WarehouseCode: item.warehouseCode,
    CountedQuantity: item.quantity,
    Counted: 'tYES',
    ...(item.binEntry !== undefined && { BinEntry: item.binEntry }),
  };

  await apiClient.patch(`/InventoryCountings(${docEntry})`, {
    InventoryCountingLines: [...keptLines, newLine],
  }, INVENTORY_COUNTING_PATCH_CONFIG);
};

export const inventaireService = {
  getCountings,
  getCountingDetail,
  getBinLocations,
  getBinLocationsForWarehouse,
  updateCountedLine,
  addCountedItem,
};



