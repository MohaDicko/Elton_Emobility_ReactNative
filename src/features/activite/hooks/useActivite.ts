// ─── Hooks React Query — Journal d'activité ───────────────────────────────────
import { useQuery } from '@tanstack/react-query';
import { activiteService } from '../services/activiteService';

/**
 * Activité de l'utilisateur connecté.
 * @param userName  Valeur de U_UtilisateurMob (userName de authStore)
 */
export const useMyActivite = (userName: string) =>
  useQuery({
    queryKey: ['activite', 'mine', userName],
    queryFn: () => activiteService.getMyActivite(userName),
    enabled: !!userName,
    staleTime: 60_000,
  });

/**
 * Toutes les activités — réservé à l'admin.
 */
export const useAllActivite = (enabled = true) =>
  useQuery({
    queryKey: ['activite', 'all'],
    queryFn: () => activiteService.getAllActivite(),
    enabled,
    staleTime: 60_000,
  });
