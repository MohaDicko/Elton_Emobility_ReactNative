// ─── Store Zustand — Liste d'étiquettes à imprimer ───────────────────────────
import { create } from 'zustand';
import type { ILabelData } from '../services/etiquetteService';

// ─── Types ───────────────────────────────────────────────────────────────────

interface IEtiquetteState {
  labels: ILabelData[];
}

interface IEtiquetteActions {
  addLabel: (label: ILabelData) => void;
  removeLabel: (itemCode: string) => void;
  updateQuantity: (itemCode: string, quantity: number) => void;
  clearLabels: () => void;
}

type IEtiquetteStore = IEtiquetteState & IEtiquetteActions;

// ─── Store ───────────────────────────────────────────────────────────────────

export const useEtiquetteStore = create<IEtiquetteStore>((set, get) => ({
  labels: [],

  addLabel: (label) => {
    const { labels } = get();
    const existing = labels.find((l) => l.itemCode === label.itemCode);

    if (existing) {
      set({
        labels: labels.map((l) =>
          l.itemCode === label.itemCode
            ? { ...l, quantity: l.quantity + label.quantity }
            : l
        ),
      });
    } else {
      set({ labels: [...labels, label] });
    }
  },

  removeLabel: (itemCode) => {
    set({ labels: get().labels.filter((l) => l.itemCode !== itemCode) });
  },

  updateQuantity: (itemCode, quantity) => {
    if (quantity <= 0) {
      get().removeLabel(itemCode);
      return;
    }
    set({
      labels: get().labels.map((l) =>
        l.itemCode === itemCode ? { ...l, quantity } : l
      ),
    });
  },

  clearLabels: () => {
    set({ labels: [] });
  },
}));
