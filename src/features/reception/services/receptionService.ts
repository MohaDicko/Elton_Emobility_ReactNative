import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import type {
  IPurchaseOrder,
  IPurchaseOrderLine,
  IPurchaseDeliveryNote,
  IPurchaseDeliveryNoteLine,
  ISapResponse,
} from '@shared/types';
import { buildPurchaseDeliveryNote } from '@shared/utils';

type ISapPurchaseOrderLine = IPurchaseOrderLine & {
  WhsCode?: string;
  OpenQty?: number;
  OpenQuantity?: number;
  OpenCreQty?: number;
  ReceivedQuantity?: number;
};

const toFiniteNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const getLineWarehouseCode = (line: ISapPurchaseOrderLine): string => {
  const raw = line.WarehouseCode ?? line.WhsCode ?? '';
  return String(raw).trim().toUpperCase();
};

const getLineRemainingQty = (line: ISapPurchaseOrderLine): number => {
  const directCandidates = [
    line.RemainingOpenQuantity,
    line.OpenQty,
    line.OpenQuantity,
    line.OpenCreQty,
  ];

  for (const candidate of directCandidates) {
    const qty = toFiniteNumber(candidate);
    if (qty > 0) return qty;
  }

  const quantity = toFiniteNumber(line.Quantity);
  const delivered = toFiniteNumber(line.DeliveredQuantity ?? line.ReceivedQuantity);
  const computed = quantity - delivered;
  return computed > 0 ? computed : 0;
};

const hasOpenLineInWarehouse = (order: IPurchaseOrder, normalizedWhs: string): boolean => {
  const lines = (order.DocumentLines ?? []) as ISapPurchaseOrderLine[];
  return lines.some((line) => {
    const lineWhs = getLineWarehouseCode(line);
    const remainingQty = getLineRemainingQty(line);
    return lineWhs === normalizedWhs && remainingQty > 0;
  });
};

const getOpenOrders = async (warehouseCode?: string): Promise<IPurchaseOrder[]> => {
  const hasWarehouse = !!warehouseCode?.trim();
  const normalizedWhs = hasWarehouse ? warehouseCode!.trim().toUpperCase() : '';

  if (!hasWarehouse) {
    const { data } = await apiClient.get<ISapResponse<IPurchaseOrder>>(ENDPOINTS.PURCHASE_ORDERS_OPEN);
    return data.value ?? [];
  }
  const { data: headers } = await apiClient.get<ISapResponse<IPurchaseOrder>>(ENDPOINTS.PURCHASE_ORDERS_OPEN);
  const openOrders = headers.value ?? [];
  if (openOrders.length === 0) return [];

  const detailed = await Promise.all(
    openOrders.map(async (order) => {
      try {
        const { data } = await apiClient.get<IPurchaseOrder>(ENDPOINTS.PURCHASE_ORDER_DETAIL(order.DocEntry));
        return hasOpenLineInWarehouse(data, normalizedWhs) ? data : null;
      } catch {
        return null;
      }
    })
  );

  return detailed.filter((order): order is IPurchaseOrder => order !== null);
};

const getOrderDetail = async (docEntry: number): Promise<IPurchaseOrder> => {
  const { data } = await apiClient.get<IPurchaseOrder>(ENDPOINTS.PURCHASE_ORDER_DETAIL(docEntry));
  return data;
};

const createDeliveryNote = async (
  cardCode: string,
  lines: IPurchaseDeliveryNoteLine[],
  userName?: string
): Promise<IPurchaseDeliveryNote> => {
  const body = buildPurchaseDeliveryNote(cardCode, lines, userName);
  const { data } = await apiClient.post<IPurchaseDeliveryNote>(
    ENDPOINTS.PURCHASE_DELIVERY_NOTES,
    body
  );
  return data;
};

export const receptionService = {
  getOpenOrders,
  getOrderDetail,
  createDeliveryNote,
};
