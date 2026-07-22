// ─── Hook statut réseau — ping SAP pour vérifier la connectivité ─────────────
import { useQuery } from '@tanstack/react-query';
import { SAP_BASE_URL } from '@core/config/constants';

/**
 * Vérifie la connectivité réseau en pingant le serveur SAP.
 * Vérifie toutes les 30 secondes.
 * Pas de dépendance externe — simple fetch avec timeout court.
 */
const useNetworkStatus = () => {
  const { data: isOnline = true, isLoading: isChecking } = useQuery({
    queryKey: ['network-status'],
    queryFn: async (): Promise<boolean> => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        await fetch(SAP_BASE_URL, {
          method: 'HEAD',
          signal: controller.signal,
        });

        clearTimeout(timeout);
        return true;
      } catch {
        return false;
      }
    },
    refetchInterval: 30000,
    staleTime: 25000,
  });

  return { isOnline, isChecking };
};

export default useNetworkStatus;
