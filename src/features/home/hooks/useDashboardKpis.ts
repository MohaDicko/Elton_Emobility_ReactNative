import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import { useAuthStore } from '@core/auth/authStore';

export interface IDashboardKpis {
  bcOpen: number | null;
  exitsMonth: number | null;
  ruptureCount: number | null;
  inventaireOpen: number | null;
}

interface IUseDashboardKpisResult {
  kpis: IDashboardKpis;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => void;
}

const escapeSapString = (value: string): string => value.replace(/'/g, "''");

const firstDayOfMonth = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const today = (): string => new Date().toISOString().slice(0, 10);

const extractCount = (data: Record<string, unknown>): number => {
  const raw = data['odata.count'];
  if (raw === undefined || raw === null) return 0;
  const n = parseInt(String(raw), 10);
  return Number.isNaN(n) ? 0 : n;
};

const extractSqlMetric = (row: Record<string, unknown>, keys: string[]): number => {
  for (const key of keys) {
    const v = row[key];
    if (v !== undefined && v !== null) {
      const n = Number(v);
      return Number.isFinite(n) ? Math.trunc(n) : 0;
    }
  }

  const low = Object.keys(row).reduce<Record<string, unknown>>((acc, key) => {
    acc[key.toLowerCase()] = row[key];
    return acc;
  }, {});

  for (const key of keys) {
    const v = low[key.toLowerCase()];
    if (v !== undefined && v !== null) {
      const n = Number(v);
      return Number.isFinite(n) ? Math.trunc(n) : 0;
    }
  }

  return 0;
};

export const useDashboardKpis = (adminWarehouseFilter = ''): IUseDashboardKpisResult => {
  const user = useAuthStore((s) => s.user);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const scopedWarehouse = user?.isAdmin
    ? adminWarehouseFilter.trim().toUpperCase()
    : (user?.warehouseCode ?? '').trim().toUpperCase();

  const fetch = useCallback(async (): Promise<IDashboardKpis> => {
    const dateFrom = firstDayOfMonth();
    const dateTo = today();
    const wh = scopedWarehouse ? escapeSapString(scopedWarehouse) : '';

    const exWhFilter = wh
      ? ` and DocumentLines/any(l:l/WarehouseCode eq '${wh}')`
      : '';

    const exEndpoint =
      `/InventoryGenExits?$filter=DocDate ge '${dateFrom}'${exWhFilter}` +
      `&$inlinecount=allpages&$top=1&$select=DocEntry`;

    const bcPromise = wh
      ? apiClient.post<{ value: Array<Record<string, unknown>> }>(
          ENDPOINTS.SQL_KPI_REC_OPEN_WHS,
          { ParamList: `WhsCode='${wh}'` }
        )
      : apiClient.get(
          `/PurchaseOrders?$filter=DocumentStatus eq 'bost_Open'` +
            `&$inlinecount=allpages&$top=1&$select=DocEntry`
        );

    const exPromise = wh
      ? apiClient.post<{ value: Array<Record<string, unknown>> }>(
          ENDPOINTS.SQL_KPI_SORTIE_MOIS_WHS,
          { ParamList: `StartDate='${dateFrom}'&EndDate='${dateTo}'&WhsCode='${wh}'` }
        )
      : apiClient.get(exEndpoint);

    // ruptureCount : par magasin (SQL) ou global (OData QuantityOnStock <= 0)
    const rupturePromise = wh
      ? apiClient.post<{ value: Array<Record<string, unknown>> }>(
          ENDPOINTS.SQL_KPI_RUPTURE_WHS,
          { ParamList: `WhsCode='${wh}'` }
        )
      : apiClient.get(
          `/Items?$filter=Frozen eq 'tNO' and ItemType eq 'itItems' and QuantityOnStock le 0` +
          `&$inlinecount=allpages&$top=1&$select=ItemCode`
        );

    // inventaireOpen : par magasin (SQL) ou global (OData DocumentStatus = cdsOpen)
    const invOpenPromise = wh
      ? apiClient.post<{ value: Array<Record<string, unknown>> }>(
          ENDPOINTS.SQL_KPI_INVENTAIRE_OPEN_WHS,
          { ParamList: `WhsCode='${wh}'` }
        )
      : apiClient.get(
          `/InventoryCountings?$filter=DocumentStatus eq 'cdsOpen'` +
          `&$inlinecount=allpages&$top=1&$select=DocEntry`
        );

    const [bcRes, exRes, ruptureRes, invOpenRes] = await Promise.allSettled([
      bcPromise,
      exPromise,
      rupturePromise,
      invOpenPromise,
    ]);

    const bcOpen = (() => {
      if (bcRes.status !== 'fulfilled') return 0;
      if (wh) {
        const row = (bcRes.value.data as { value?: Array<Record<string, unknown>> }).value?.[0] ?? {};
        return extractSqlMetric(row, ['BcOpen']);
      }
      return extractCount(bcRes.value.data);
    })();

    const exitsMonth = (() => {
      if (exRes.status !== 'fulfilled') return 0;
      if (wh) {
        const row = (exRes.value.data as { value?: Array<Record<string, unknown>> }).value?.[0] ?? {};
        return extractSqlMetric(row, ['SortiesMois']);
      }
      return extractCount(exRes.value.data);
    })();

    const ruptureCount = (() => {
      if (ruptureRes.status !== 'fulfilled') return 0;
      if (wh) {
        const row = (ruptureRes.value.data as { value?: Array<Record<string, unknown>> }).value?.[0] ?? {};
        return extractSqlMetric(row, ['Ruptures']);
      }
      return extractCount(ruptureRes.value.data);
    })();

    const inventaireOpen = (() => {
      if (invOpenRes.status !== 'fulfilled') return 0;
      if (wh) {
        const row = (invOpenRes.value.data as { value?: Array<Record<string, unknown>> }).value?.[0] ?? {};
        return extractSqlMetric(row, ['OpenDocs', 'InvOpen']);
      }
      return extractCount(invOpenRes.value.data);
    })();

    return { bcOpen, exitsMonth, ruptureCount, inventaireOpen };
  }, [scopedWarehouse]);

  const query = useQuery<IDashboardKpis>({
    queryKey: ['kpis', 'home', scopedWarehouse],
    queryFn: fetch,
    staleTime: 2 * 60 * 1000,
  });

  const kpis = query.data ?? { bcOpen: null, exitsMonth: null, ruptureCount: null, inventaireOpen: null }; // null = chargement en cours
  const loading = query.isLoading;
  const error = query.error ? 'Impossible de charger les indicateurs' : null;

  return {
    kpis,
    loading,
    refreshing: manualRefreshing,
    error,
    refresh: () => {
      setManualRefreshing(true);
      void query.refetch().finally(() => setManualRefreshing(false));
    },
  };
};
