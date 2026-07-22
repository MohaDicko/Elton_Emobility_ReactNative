// ─── Store Zustand — Session de comptage d'inventaire (volatile) ──────────────
// L'état du formulaire de comptage (article/qté/bin en cours) vit dans le
// composant [docEntry].tsx — seuls la sélection du document et le suivi
// de complétion sont partagés.
import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────────────────────

interface IInventaireState {
  /** Document SAP actuellement ouvert pour comptage */
  selectedDocEntry: number | null;
}

interface IInventaireActions {
  selectDocument: (docEntry: number) => void;
  clearDocument: () => void;
}

type IInventaireStore = IInventaireState & IInventaireActions;

// ─── Store ───────────────────────────────────────────────────────────────────

export const useInventaireStore = create<IInventaireStore>((set) => ({
  selectedDocEntry: null,

  selectDocument: (docEntry) => set({ selectedDocEntry: docEntry }),

  clearDocument: () => set({ selectedDocEntry: null }),
}));
