import { validateBarcode, validateQuantity, validateRequiredFields } from '@shared/utils/validators';

describe('business validators required by the Elton specification', () => {
  it('rejects invalid quantities and quantities above available stock', () => {
    expect(validateQuantity(Number.NaN)).toEqual({
      valid: false,
      error: 'La quantité doit être un nombre valide',
    });
    expect(validateQuantity(0).valid).toBe(false);
    expect(validateQuantity(6, 5)).toEqual({
      valid: false,
      error: 'La quantité ne peut pas dépasser 5',
    });
    expect(validateQuantity(5, 5).valid).toBe(true);
  });

  it('rejects malformed barcodes and accepts EAN lengths', () => {
    expect(validateBarcode('ABC12345').valid).toBe(false);
    expect(validateBarcode('1234567').valid).toBe(false);
    expect(validateBarcode('12345678').valid).toBe(true);
    expect(validateBarcode('1234567890123').valid).toBe(true);
  });

  it('treats whitespace-only required fields as missing', () => {
    expect(validateRequiredFields({ motif: '   ' }, ['motif'])).toEqual({
      valid: false,
      missingFields: ['motif'],
    });
    expect(validateRequiredFields({ motif: 'Casse' }, ['motif']).valid).toBe(true);
  });
});
