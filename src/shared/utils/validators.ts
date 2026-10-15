// ─── Validateurs pour les formulaires SAP ────────────────────────────────────

interface IValidationResult {
  valid: boolean;
  error?: string;
}

/** Valide une quantité (> 0, optionnellement <= max) */
export const validateQuantity = (qty: number, max?: number): IValidationResult => {
  if (!Number.isFinite(qty)) {
    return { valid: false, error: 'La quantité doit être un nombre valide' };
  }
  if (qty <= 0) {
    return { valid: false, error: 'La quantité doit être supérieure à 0' };
  }
  if (max !== undefined && (!Number.isFinite(max) || max < 0)) {
    return { valid: false, error: 'Le stock maximal est invalide' };
  }
  if (max !== undefined && qty > max) {
    return { valid: false, error: `La quantité ne peut pas dépasser ${max}` };
  }
  return { valid: true };
};

/** Valide un code-barres (EAN-8 ou EAN-13) */
export const validateBarcode = (barcode: string): IValidationResult => {
  const trimmed = barcode.trim();

  if (!/^\d+$/.test(trimmed)) {
    return { valid: false, error: 'Le code-barres ne doit contenir que des chiffres' };
  }

  if (trimmed.length !== 8 && trimmed.length !== 13) {
    return { valid: false, error: 'Le code-barres doit faire 8 ou 13 caractères (EAN-8 / EAN-13)' };
  }

  return { valid: true };
};

/** Valide que tous les champs requis sont remplis */
export const validateRequiredFields = (
  obj: Record<string, unknown>,
  fields: string[]
): { valid: boolean; missingFields: string[] } => {
  const missingFields = fields.filter((field) => {
    const value = obj[field];
    return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
  });

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
};
