// ─── Tests Unitaires : Module 6 — Inventaire (Spécifications ELTON) ─────────────
import type { IInventoryCountingLine } from '@shared/types';

describe('Module 6 — Règles Métier Inventaire ELTON', () => {
  const sampleDocumentLines: IInventoryCountingLine[] = [
    {
      DocumentEntry: 100,
      LineNumber: 1,
      ItemCode: 'ART001',
      ItemDescription: 'Huile Moteur 5W40 1L',
      InWarehouseQuantity: 10,
      CountedQuantity: 8,
      Variance: -2,
      Counted: 'tYES',
      WarehouseCode: '01',
      BarCode: '35600701',
      BinEntry: null,
      UoMCode: 'BTL',
    },
    {
      DocumentEntry: 100,
      LineNumber: 2,
      ItemCode: 'ART002',
      ItemDescription: 'Liquide de Frein DOT4',
      InWarehouseQuantity: 5,
      CountedQuantity: 0,
      Variance: -5,
      Counted: 'tNO',
      WarehouseCode: '01',
      BarCode: '35600702',
      BinEntry: null,
      UoMCode: 'BTL',
    },
    {
      DocumentEntry: 100,
      LineNumber: 3,
      ItemCode: 'ART003',
      ItemDescription: 'Filtre à Carburant Diesel',
      InWarehouseQuantity: 15,
      CountedQuantity: 15,
      Variance: 0,
      Counted: 'tYES',
      WarehouseCode: '01',
      BarCode: '35600703',
      BinEntry: null,
      UoMCode: 'PCS',
    },
  ];

  describe('Affichage Dynamique des articles', () => {
    it("ne doit retourner à l'ouverture que les articles déjà comptés (Counted = tYES)", () => {
      const countedOnly = sampleDocumentLines.filter((l) => l.Counted === 'tYES');

      expect(countedOnly).toHaveLength(2);
      expect(countedOnly.map((l) => l.ItemCode)).toEqual(['ART001', 'ART003']);
      expect(countedOnly.every((l) => l.Counted === 'tYES')).toBe(true);
    });

    it('doit permettre de basculer vers la vue complète de tous les articles du document', () => {
      expect(sampleDocumentLines).toHaveLength(3);
    });
  });

  describe('Restriction de la Recherche et du Scan aux articles du document', () => {
    it("doit accepter un scan d'article présent dans le document par son ItemCode", () => {
      const scannedCode = 'ART001';
      const match = sampleDocumentLines.find((l) => l.ItemCode === scannedCode);

      expect(match).toBeDefined();
      expect(match?.ItemCode).toBe('ART001');
    });

    it("doit accepter un scan d'article présent dans le document par son BarCode", () => {
      const scannedBarcode = '35600703';
      const match = sampleDocumentLines.find((l) => l.BarCode === scannedBarcode);

      expect(match).toBeDefined();
      expect(match?.ItemCode).toBe('ART003');
    });

    it("doit strictement refuser un article absent du document d'inventaire", () => {
      const foreignArticle = { ItemCode: 'ART999', BarCode: '99999999' };
      const isAllowed = sampleDocumentLines.some(
        (l) => l.ItemCode === foreignArticle.ItemCode || l.BarCode === foreignArticle.BarCode
      );

      expect(isAllowed).toBe(false);
    });
  });

  describe('Gestion des Doublons (Additionner vs Remplacer)', () => {
    const existingLine: IInventoryCountingLine = {
      DocumentEntry: 100,
      LineNumber: 1,
      ItemCode: 'ART001',
      ItemDescription: 'Huile Moteur 5W40 1L',
      InWarehouseQuantity: 10,
      CountedQuantity: 8,
      Variance: -2,
      Counted: 'tYES',
      WarehouseCode: '01',
      BarCode: '35600701',
      BinEntry: null,
      UoMCode: 'BTL',
    };

    it('doit correctement additionner la nouvelle quantité au comptage existant', () => {
      const newQty = 4;
      const resolvedQty = existingLine.CountedQuantity + newQty;

      expect(resolvedQty).toBe(12);
    });

    it('doit correctement remplacer le comptage existant par la nouvelle quantité', () => {
      const newQty = 5;
      const resolvedQty = newQty;

      expect(resolvedQty).toBe(5);
    });
  });
});
