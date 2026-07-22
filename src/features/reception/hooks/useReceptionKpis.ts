import { useCallback, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import { useAuthStore } from '@core/auth/authStore';
import type { IModuleKpi } from '@shared/components/ui/ModuleKpiStrip';

const today = () => new Date().toISOString().slice(0, 10);
const escapeSapString = (value: string): string => value.replace(/'/g, "''");

const extractCount = (data: Record<string, unknown>): number => {
  const raw = data['odata.count'];
  return raw !== undefined ? parseInt(String(raw), 10) || 0 : (data.value as unknown[])?.length ?? 0;
};

const toInt = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

const pickMetric = (row: Record<string, unknown>, candidateKeys: string[]): number => {
  for (const key of candidateKeys) {
    if (row[key] !== undefined && row[key] !== null) {
      return toInt(row[key]);
    }
  }

  const lowered = Object.keys(row).reduce<Record<string, unknown>>((acc, k) => {
    acc[k.toLowerCase()] = row[k];
    return acc;
  }, {});

  for (const key of candidateKeys) {
    const value = lowered[key.toLowerCase()];
    if (value !== undefined && value !== null) {
      return toInt(value);
    }
  }

  return 0;
};

interface IResult {
  kpis: IModuleKpi[];
  refresh: () => void;
  refreshing: boolean;
}

export const useReceptionKpis = (adminWarehouseFilter = ''): IResult => {
  const user = useAuthStore((s) => s.user);
  const hasShownSqlWarning = useRef(false);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const warehouseCode = user?.isAdmin
    ? adminWarehouseFilter.trim().toUpperCase()
    : (user?.warehouseCode ?? '').trim().toUpperCase();

  const fetch = useCallback(async (): Promise<{ bcOpen: number; suppliers: number; overdue: number }> => {
    // Per-warehouse mode: use SQLQueries because some Service Layer versions reject any(...) on DocumentLines.
    if (warehouseCode) {
      const safeWhs = escapeSapString(warehouseCode);
      const paramsOpen = `WhsCode='${safeWhs}'`;
      const paramsOverdue = `WhsCode='${safeWhs}'&Today='${today()}'`;

      const [openRes, supRes, overdueRes] = await Promise.allSettled([
        apiClient.post<{ value: Array<Record<string, unknown>> }>(
          ENDPOINTS.SQL_KPI_REC_OPEN_WHS,
          { ParamList: paramsOpen }
        ),
        apiClient.post<{ value: Array<Record<string, unknown>> }>(
          ENDPOINTS.SQL_KPI_REC_SUP_WHS,
          { ParamList: paramsOpen }
        ),
        apiClient.post<{ value: Array<Record<string, unknown>> }>(
          ENDPOINTS.SQL_KPI_REC_OVD_WHS,
          { ParamList: paramsOverdue }
        ),
      ]);

      if (
        openRes.status === 'fulfilled' &&
        supRes.status === 'fulfilled' &&
        overdueRes.status === 'fulfilled'
      ) {
        const openRow = openRes.value.data.value?.[0] ?? {};
        const supRow = supRes.value.data.value?.[0] ?? {};
        const overdueRow = overdueRes.value.data.value?.[0] ?? {};
        hasShownSqlWarning.current = false;
        return {
          bcOpen: pickMetric(openRow, ['BcOpen']),
          suppliers: pickMetric(supRow, ['Suppliers']),
          overdue: pickMetric(overdueRow, ['Overdue']),
        };
      } else {
        if (!hasShownSqlWarning.current) {
          Toast.show({
            type: 'info',
            text1: 'KPI reception',
            text2: `Filtre magasin indisponible (${warehouseCode}), valeurs a 0.`,
          });
          hasShownSqlWarning.current = true;
        }
        return { bcOpen: 0, suppliers: 0, overdue: 0 };
      }
    }

    // Global mode: keep OData query (works without DocumentLines/any filter).
    const openEndpoint =
      `/PurchaseOrders?$filter=DocumentStatus eq 'bost_Open'&$select=DocEntry,CardCode&$top=500`;

    const overdueEndpoint =
      `/PurchaseOrders?$filter=DocumentStatus eq 'bost_Open' and DocDueDate lt '${today()}'` +
      `&$inlinecount=allpages&$top=1&$select=DocEntry`;

    const [openRes, overdueRes] = await Promise.allSettled([
      apiClient.get(openEndpoint),
      apiClient.get(overdueEndpoint),
    ]);

    let bcOpen = 0;
    let suppliers = 0;
    if (openRes.status === 'fulfilled') {
      const rows: { CardCode: string }[] = openRes.value.data.value ?? [];
      bcOpen = rows.length;
      suppliers = new Set(rows.map((r) => r.CardCode)).size;
    }

    let overdue = 0;
    if (overdueRes.status === 'fulfilled') {
      overdue = extractCount(overdueRes.value.data);
    }
    return { bcOpen, suppliers, overdue };
  }, [warehouseCode]);

  const query = useQuery<{ bcOpen: number; suppliers: number; overdue: number }>({
    queryKey: ['kpis', 'reception', warehouseCode],
    queryFn: fetch,
    staleTime: 2 * 60 * 1000,
  });

  const bcOpen = query.data?.bcOpen ?? null;
  const suppliers = query.data?.suppliers ?? null;
  const overdue = query.data?.overdue ?? null;

  const kpis: IModuleKpi[] = [
    {
      label: 'BC a receptionner',
      value: bcOpen,
      icon: 'inbox-arrow-down-outline',
      status: bcOpen === null ? 'info' : bcOpen > 0 ? 'warning' : 'ok',
      sub: 'Bons ouverts',
    },
    {
      label: 'Fournisseurs',
      value: suppliers,
      icon: 'truck-outline',
      status: 'info',
      sub: 'Distincts',
    },
    {
      label: 'En retard',
      value: overdue,
      icon: 'clock-alert-outline',
      status: overdue === null ? 'info' : overdue > 0 ? 'critical' : 'ok',
      sub: 'Date depassee',
    },
  ];

  return {
    kpis,
    refresh: () => {
      setManualRefreshing(true);
      void query.refetch().finally(() => setManualRefreshing(false));
    },
    refreshing: manualRefreshing,
  };
};
