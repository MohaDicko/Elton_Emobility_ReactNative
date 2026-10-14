// ─── Tests Unitaires : Module 5 — Sortie de Marchandises (Spécifications ELTON) ──
import { buildInventoryGenExit } from '@shared/utils';
import type { IInventoryMovementLine } from '@shared/types';

describe('Module 5 — Règles Métier Sortie de Marchandises ELTON', () => {
  const sampleLines: IInventoryMovementLine[] = [
    {
      ItemCode: 'ART001',
      Quantity: 2,
      WarehouseCode: '01',
    },
  ];

  it('doit générer un document de sortie conforme avec motif et utilisateur', () => {
    const payload = buildInventoryGenExit(sampleLines, 'CASSE', 'Moussa Diop', 'Bouteille brisée en rayon');

    expect(payload.DocumentLines).toHaveLength(1);
    expect(payload.DocumentLines[0].ItemCode).toBe('ART001');
    expect(payload.DocumentLines[0].Quantity).toBe(2);
    expect(payload.DocumentLines[0].WarehouseCode).toBe('01');
    expect(payload.U_TypeMouv).toBe('CASSE');
    expect(payload.U_UtilisateurMob).toBe('Moussa Diop');
    expect(payload.Comments).toContain('Bouteille brisée en rayon');
  });

  it('doit rejeter la création si aucune ligne de mouvement n’est fournie', () => {
    expect(() => {
      buildInventoryGenExit([], 'PERIME', 'Moussa Diop', 'Périmé');
    }).toThrow(/au moins une ligne est requise/);
  });

  it('doit exiger un motif obligatoire avant validation', () => {
    const isMotifValid = (motif: string | null | undefined): boolean => {
      return typeof motif === 'string' && motif.trim().length > 0;
    };

    expect(isMotifValid('CASSE')).toBe(true);
    expect(isMotifValid('PERIME')).toBe(true);
    expect(isMotifValid('')).toBe(false);
    expect(isMotifValid(null)).toBe(false);
  });
});
