// ─── Helper SHA-256 via expo-crypto ──────────────────────────────────────────
// Utilisé par : authStore (login utilisateur) + adminService (création/reset mdp)
// expo-crypto est inclus dans Expo SDK — pas d'installation supplémentaire.
import * as ExpoCrypto from 'expo-crypto';

export async function sha256Hex(input: string): Promise<string> {
  return ExpoCrypto.digestStringAsync(
    ExpoCrypto.CryptoDigestAlgorithm.SHA256,
    input
  );
}
