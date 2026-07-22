// ─── Hook Familles d'articles — chargé une seule fois ────────────────────────
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { itemService } from '@shared/services';
import type { IItemGroup } from '@shared/types';

interface IUseItemGroupsResult {
  groups: IItemGroup[];
  isLoading: boolean;
  /** Résout un ItemsGroupCode en nom de famille lisible */
  getGroupName: (groupCode: number) => string;
}

/**
 * Charge les familles d'articles depuis SAP (ItemGroups).
 * staleTime: Infinity — les familles ne changent quasiment jamais en production.
 */
const useItemGroups = (): IUseItemGroupsResult => {
  const { data, isLoading } = useQuery({
    queryKey: ['item-groups'],
    queryFn: () => itemService.getItemGroups(),
    staleTime: Infinity,
  });

  const groups = data ?? [];

  const getGroupName = useCallback(
    (groupCode: number): string => {
      const group = groups.find((g) => g.Number === groupCode);
      return group?.GroupName ?? '—';
    },
    [groups]
  );

  return { groups, isLoading, getGroupName };
};

export default useItemGroups;
