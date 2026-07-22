// ─── Hook entrepôts — chargés dynamiquement depuis SAP ──────────────────────
import { useQuery } from '@tanstack/react-query';
import { warehouseService } from '@shared/services';

/**
 * Récupère et cache la liste des entrepôts SAP.
 * staleTime: 5 min + refetchOnMount pour rafraichir la liste depuis SAP.
 */
const useWarehouses = () => {
  const { data: warehouses = [], isLoading, error } = useQuery({
    queryKey: ['warehouses'],
    queryFn: warehouseService.getAll,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
  });

  return { warehouses, isLoading, error };
};

export default useWarehouses;

