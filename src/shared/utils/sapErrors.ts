// ─── Détection des erreurs SAP B1 particulières ──────────────────────────────

/**
 * Retourne true si l'erreur SAP correspond à un processus d'approbation déclenché.
 *
 * SAP B1 retourne HTTP 404 OU code -2028 quand un document est soumis
 * à un workflow d'approbation. Le document EST créé en base (statut
 * "En attente d'approbation") — ce n'est PAS une vraie erreur.
 *
 * Règle CLAUDE.md #14.
 */
export const isSapApprovalProcess = (error: unknown): boolean => {
  const err = error as any;
  return (
    err?.response?.status === 404 ||
    err?.response?.data?.error?.code === -2028
  );
};

/**
 * Extrait le message d'erreur lisible depuis une réponse d'erreur SAP B1 (Axios).
 * Format SAP B1 : { error: { code: number, message: { lang: string, value: string } } }
 *
 * Exemples de messages retournés par SAP :
 *   "Item A00003 not found in Warehouse 02"  (code 10000515)
 *   "Row without matching records found"      (code -5002)
 *   "Item is blocked"                        (code 10001481)
 *
 * Fallback sur error.message si pas de réponse SAP structurée.
 * NE PAS transformer dans l'interceptor Axios — isSapApprovalProcess
 * et sortieService lisent error.response.data sur l'erreur originale.
 */
export const extractSapErrorMessage = (error: unknown): string => {
  const err = error as any;
  const sapValue = err?.response?.data?.error?.message?.value;
  if (sapValue) return sapValue;
  if (error instanceof Error) return error.message;
  return 'Erreur inconnue';
};
