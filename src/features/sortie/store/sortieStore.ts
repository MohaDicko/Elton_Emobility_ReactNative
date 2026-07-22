// ─── Store Zustand — Panier de sortie marchandises (volatile) ────────────────
import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Motifs de sortie SAP — valeurs exactes configurées dans SAP B1 */
export type SortieMotifT = 'CASSE' | 'PERIME' | 'ECONOMAT';

export const SORTIE_MOTIFS: Array<{
  value: SortieMotifT;
  label: string;
  icon: string;
}> = [
  { value: 'CASSE',    label: 'Casse',    icon: 'package-variant-remove' },
  { value: 'PERIME',   label: 'Périmés',  icon: 'calendar-remove'        },
  { value: 'ECONOMAT', label: 'Économat', icon: 'office-building'        },
];

export interface ISortieItem {
  itemCode: string;
  itemName: string;
  quantity: number;
  warehouseCode: string;
  /** Stock disponible dans l'entrepôt au moment de l'ajout au panier (informatif) */
  availableStock?: number;
}

interface ISortieState {
  cart: ISortieItem[];
  /** Entrepôt par défaut (mémorisé entre les ajouts) */
  defaultWarehouse: string;
  /** Motif de sortie — valeur exacte SAP B1 : CASSE | PERIME | ECONOMAT */
  motif: SortieMotifT | null;
  /** Commentaire libre — obligatoire avant validation (stocké dans Comments SAP) */
  commentaire: string;
}

interface ISortieActions {
  addToCart: (item: ISortieItem) => void;
  removeFromCart: (itemCode: string) => void;
  updateQuantity: (itemCode: string, quantity: number) => void;
  setDefaultWarehouse: (code: string) => void;
  setMotif: (motif: SortieMotifT) => void;
  setCommentaire: (commentaire: string) => void;
  clearCart: () => void;
}

type ISortieStore = ISortieState & ISortieActions;

// ─── Store ───────────────────────────────────────────────────────────────────

export const useSortieStore = create<ISortieStore>((set, get) => ({
  cart: [],
  defaultWarehouse: '',
  motif: null,
  commentaire: '',

  addToCart: (item) => {
    const { cart } = get();
    // Clé composite itemCode + warehouseCode — même article sur deux entrepôts = deux lignes distinctes
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

  removeFromCart: (itemCode) => {
    set({ cart: get().cart.filter((c) => c.itemCode !== itemCode) });
  },

  updateQuantity: (itemCode, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(itemCode);
      return;
    }
    set({
      cart: get().cart.map((c) =>
        c.itemCode === itemCode ? { ...c, quantity } : c
      ),
    });
  },

  setDefaultWarehouse: (code) => {
    set({ defaultWarehouse: code });
  },

  setMotif: (motif) => {
    set({ motif });
  },

  setCommentaire: (commentaire) => {
    set({ commentaire });
  },

  clearCart: () => {
    set({ cart: [], motif: null, commentaire: '' });
  },
}));
