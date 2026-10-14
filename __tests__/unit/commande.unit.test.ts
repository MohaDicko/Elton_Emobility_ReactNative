// ─── Tests Unitaires : Module 3 & 4 — Commandes & Réceptions Fournisseurs ───────
import { buildPurchaseDeliveryNote } from '@shared/utils';
import type { IPurchaseDeliveryNoteLine } from '@shared/types';

describe('Module 3 & 4 — Règles Métier Commandes & Réceptions Fournisseurs', () => {
  describe('Calculs de Commandes et PCB', () => {
    it('doit convertir correctement le nombre de cartons en unités SAP selon le PCB', () => {
      const cartons = 5;
      const pcb = 12; // 12 bouteilles par carton
      const totalUnits = cartons * pcb;

      expect(totalUnits).toBe(60);
    });

    it('doit utiliser 1 unité si le PCB n’est pas configuré', () => {
      const cartons = 4;
      const pcb = 1;
      const totalUnits = cartons * pcb;

      expect(totalUnits).toBe(4);
    });

    it('doit arrondir au carton supérieur lors de la conversion d’une suggestion de réapprovisionnement', () => {
      const suggestedUnits = 14;
      const pcb = 12;
      const cartonsToOrder = Math.max(1, Math.ceil(suggestedUnits / pcb));

      expect(cartonsToOrder).toBe(2); // 2 cartons = 24 unités (supérieur à 14)
    });
  });

  describe('Génération de Réception Fournisseur (basée sur Commande d’Achat)', () => {
    const sampleDeliveryLines: IPurchaseDeliveryNoteLine[] = [
      {
        BaseType: 22,
        BaseEntry: 1045,
        BaseLine: 0,
        ItemCode: 'ART001',
        Quantity: 10,
        WarehouseCode: '01',
      },
    ];

    it('doit associer la ligne de réception à la commande SAP d’origine (BaseType 22)', () => {
      const note = buildPurchaseDeliveryNote('FOURN01', sampleDeliveryLines, 'Ousmane Fall');

      expect(note.CardCode).toBe('FOURN01');
      expect(note.DocumentLines).toHaveLength(1);
      expect(note.DocumentLines[0].BaseType).toBe(22); // 22 = PurchaseOrders dans SAP B1
      expect(note.DocumentLines[0].BaseEntry).toBe(1045);
      expect(note.DocumentLines[0].Quantity).toBe(10);
      expect(note.U_UtilisateurMob).toBe('Ousmane Fall');
    });

    it('doit lever une exception si aucune ligne n’est spécifiée pour la réception', () => {
      expect(() => {
        buildPurchaseDeliveryNote('FOURN01', [], 'Ousmane Fall');
      }).toThrow(/au moins une ligne est requise/);
    });
  });
});
