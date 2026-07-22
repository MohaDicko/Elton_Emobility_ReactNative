// ─── Store Zustand — Panier de commande (volatile, pas de persistance) ──────
import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ICartItem {
  itemCode: string;
  itemName: string;
  quantity: number;      // unités réelles envoyées à SAP (= pcbQty × pcb)
  pcb: number;           // taille du carton — 1 si l'article n'a pas de PCB configuré
  warehouseCode: string;
  supplierCode: string;   // DefaultVendorNumber SAP — '' si non configuré
  supplierName: string;   // CardName résolu depuis le cache fournisseurs
}

interface ICommandeState {
  cart: ICartItem[];
}

interface ICommandeActions {
  addToCart: (item: ICartItem) => void;
  removeFromCart: (itemCode: string, warehouseCode: string) => void;
  updateQuantity: (itemCode: string, warehouseCode: string, quantity: number) => void;
  clearCart: () => void;
}

type ICommandeStore = ICommandeState & ICommandeActions;

// ─── Store ───────────────────────────────────────────────────────────────────

export const useCommandeStore = create<ICommandeStore>((set, get) => ({
  cart: [],

  addToCart: (item) => {
    const { cart } = get();
    // Clé composite itemCode + warehouseCode — même article sur deux entrepôts = deux lignes
    const existing = cart.find(
      (c) => c.itemCode === item.itemCode && c.warehouseCode === item.warehouseCode
    );

    if (existing) {
      set({
        cart: cart.map((c) =>
          c.itemCode === item.itemCode && c.warehouseCode === item.warehouseCode
            ? { ...c, quantity: c.quantity + item.quantity }
            : c
        ),
      });
    } else {
      set({ cart: [...cart, item] });
    }
  },

  removeFromCart: (itemCode, warehouseCode) => {
    set({
      cart: get().cart.filter(
        (c) => !(c.itemCode === itemCode && c.warehouseCode === warehouseCode)
      ),
    });
  },

  updateQuantity: (itemCode, warehouseCode, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(itemCode, warehouseCode);
      return;
    }
    set({
      cart: get().cart.map((c) =>
        c.itemCode === itemCode && c.warehouseCode === warehouseCode
          ? { ...c, quantity }
          : c
      ),
    });
  },

  clearCart: () => {
    set({ cart: [] });
  },
}));
