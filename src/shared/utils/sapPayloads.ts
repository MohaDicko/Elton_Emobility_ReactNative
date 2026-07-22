// ─── Builders de payloads SAP Service Layer ──────────────────────────────────
import { formatSapDate } from './formatters';
import type {
  IPurchaseDeliveryNote,
  IPurchaseDeliveryNoteLine,
  IInventoryGenExit,
  IInventoryMovementLine,
  IInventoryPosting,
  IInventoryPostingLine,
} from '@shared/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const assertLinesNotEmpty = (lines: unknown[], entity: string): void => {
  if (lines.length === 0) {
    throw new Error(`[sapPayloads] ${entity} : au moins une ligne est requise`);
  }
};

// ─── Réception marchandises (basée sur un BC) ────────────────────────────────

export const buildPurchaseDeliveryNote = (
  cardCode: string,
  lines: IPurchaseDeliveryNoteLine[],
  /** Nom de l'utilisateur connecté — injecté dans Comments ET U_UtilisateurMob */
  userName?: string
): IPurchaseDeliveryNote => {
  assertLinesNotEmpty(lines, 'PurchaseDeliveryNote');
  const today = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const comments = `Réception via GlobalAction Mobile | Utilisateur : ${userName ?? 'Inconnu'} | ${today}`;
  return {
    CardCode: cardCode,
    DocDate: formatSapDate(),
    Comments: comments,
    ...(userName && { U_UtilisateurMob: userName }),
    DocumentLines: lines.map((line) => ({
      ...line,
      BaseType: 22 as const,
    })),
  };
};

// ─── Sortie de marchandises ──────────────────────────────────────────────────

export const buildInventoryGenExit = (
  lines: IInventoryMovementLine[],
  /** Motif SAP — UDF U_TypeMouv : 'CASSE' | 'PERIME' | 'ECONOMAT' */
  motif?: string,
  /** Nom de l'utilisateur connecté — injecté dans Comments ET U_UtilisateurMob */
  userName?: string,
  /** Commentaire libre saisi par l'utilisateur — obligatoire avant envoi */
  commentaire?: string,
): IInventoryGenExit => {
  assertLinesNotEmpty(lines, 'InventoryGenExit');
  const appSignature = `[GlobalAction Mobile] ${userName ?? 'Utilisateur inconnu'}`;
  const comments = commentaire?.trim()
    ? `${commentaire.trim()} | ${appSignature}`
    : appSignature;
  return {
    DocDate: formatSapDate(),
    Comments: comments,
    ...(motif && { U_TypeMouv: motif }),
    ...(userName && { U_UtilisateurMob: userName }),
    DocumentLines: lines,
  };
};

// ─── Validation d'inventaire (posting) ───────────────────────────────────────

export const buildInventoryPosting = (
  countingId: number,
  lines: IInventoryPostingLine[]
): IInventoryPosting => {
  assertLinesNotEmpty(lines, 'InventoryPosting');
  return {
    CountingID: countingId,
    InventoryPostingLines: lines,
  };
};
