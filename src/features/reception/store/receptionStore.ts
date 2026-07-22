// ─── Store Zustand — Réception marchandises (volatile) ───────────────────────
import { create } from 'zustand';
import type { IPurchaseOrder } from '@shared/types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface IReceptionLine {
  lineNum: number;
  itemCode: string;
  itemDescription: string;
  warehouseCode: string;
  /** Quantité commandée sur le BC */
  orderedQuantity: number;
  /** Quantité déjà livrée précédemment */
  deliveredQuantity: number;
  /** Quantité restante à livrer */
  remainingQuantity: number;
  /** Quantité reçue maintenant (saisie utilisateur) */
  receivedQuantity: number;
}

interface IReceptionState {
  /** BC source sélectionné */
  selectedOrder: IPurchaseOrder | null;
  /** Lignes de réception (une par ligne du BC) */
  lines: IReceptionLine[];
}

interface IReceptionActions {
  setOrder: (order: IPurchaseOrder, warehouseCode?: string) => void;
  updateReceivedQuantity: (lineNum: number, quantity: number) => void;
  /** Marque toutes les lignes comme reçues (quantité restante) */
  receiveAll: () => void;
  clearReception: () => void;
}

type IReceptionStore = IReceptionState & IReceptionActions;

// ─── Store ───────────────────────────────────────────────────────────────────

export const useReceptionStore = create<IReceptionStore>((set, get) => ({
  selectedOrder: null,
  lines: [],

  setOrder: (order, warehouseCode) => {
    const normalizedWhs = (warehouseCode ?? '').trim().toUpperCase();
    const lineWarehouse = (line: IPurchaseOrder['DocumentLines'][number]) => {
      const sapLine = line as IPurchaseOrder['DocumentLines'][number] & { WhsCode?: string };
      return String(sapLine.WarehouseCode ?? sapLine.WhsCode ?? '').trim().toUpperCase();
    };
    const lineRemaining = (line: IPurchaseOrder['DocumentLines'][number]) => {
      const sapLine = line as IPurchaseOrder['DocumentLines'][number] & {
        OpenQty?: number;
        OpenQuantity?: number;
        OpenCreQty?: number;
        ReceivedQuantity?: number;
      };
      const direct = Number(
        sapLine.RemainingOpenQuantity ??
        sapLine.OpenQty ??
        sapLine.OpenQuantity ??
        sapLine.OpenCreQty ??
        0
      );
      if (Number.isFinite(direct) && direct > 0) return direct;
      const qty = Number(sapLine.Quantity ?? 0);
      const delivered = Number(sapLine.DeliveredQuantity ?? sapLine.ReceivedQuantity ?? 0);
      const computed = qty - delivered;
      return Number.isFinite(computed) && computed > 0 ? computed : 0;
    };

    // Transformer les lignes du BC en lignes de réception
    const lines: IReceptionLine[] = (order.DocumentLines || [])
      .filter((line) => lineRemaining(line) > 0)
      .filter((line) => !normalizedWhs || lineWarehouse(line) === normalizedWhs)
      .map((line) => {
        const sapLine = line as IPurchaseOrder['DocumentLines'][number] & {
          WhsCode?: string;
          ReceivedQuantity?: number;
        };
        const remaining = lineRemaining(line);
        return {
        lineNum: line.LineNum,
        itemCode: line.ItemCode,
        itemDescription: line.ItemDescription,
        warehouseCode: sapLine.WarehouseCode ?? sapLine.WhsCode ?? '',
        orderedQuantity: line.Quantity,
        // SAP omet DeliveredQuantity quand il vaut 0 → fallback calculé
          deliveredQuantity: line.DeliveredQuantity ?? sapLine.ReceivedQuantity ?? (line.Quantity - remaining),
          remainingQuantity: remaining,
          receivedQuantity: remaining, // Par défaut : tout réceptionner
        };
      });

    set({ selectedOrder: order, lines });
  },

  updateReceivedQuantity: (lineNum, quantity) => {
    set({
      lines: get().lines.map((l) =>
        l.lineNum === lineNum
          ? { ...l, receivedQuantity: Math.max(0, Math.min(quantity, l.remainingQuantity)) }
          : l
      ),
    });
  },

  receiveAll: () => {
    set({
      lines: get().lines.map((l) => ({
        ...l,
        receivedQuantity: l.remainingQuantity,
      })),
    });
  },

  clearReception: () => {
    set({ selectedOrder: null, lines: [] });
  },
}));
