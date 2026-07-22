import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import { useAuthStore } from '@core/auth/authStore';
import type { IModuleKpi } from '@shared/components/ui/ModuleKpiStrip';

const firstOfMonth = (offset = 0): string => {
  const d = new Date();
  d.setMonth(d.getMonth() + offset, 1);
  return d.toISOString().slice(0, 10);
};

const lastOfMonth = (offset = 0): string => {
  const d = new Date();
  d.setMonth(d.getMonth() + offset + 1, 0);
  return d.toISOString().slice(0, 10);
};

const escapeSapString = (value: string): string => value.replace(/'/g, "''");
const extractSqlMetric = (row: Record<string, unknown>, keys: string[]): number => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null) {
      const n = Number(value);
      return Number.isFinite(n) ? Math.trunc(n) : 0;
    }
  }

  const lowered = Object.keys(row).reduce<Record<string, unknown>>((acc, key) => {
    acc[key.toLowerCase()] = row[key];
    return acc;
  }, {});

  for (const key of keys) {
    const value = lowered[key.toLowerCase()];
    if (value !== undefined && value !== null) {
      const n = Number(value);
      return Number.isFinite(n) ? Math.trunc(n) : 0;
    }
  }

  return 0;
};

const extractSqlText = (row: Record<string, unknown>, keys: string[]): string => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null) {
      const text = String(value).trim();
      if (text.length > 0) return text;
    }
  }

  const lowered = Object.keys(row).reduce<Record<string, unknown>>((acc, key) => {
    acc[key.toLowerCase()] = row[key];
    return acc;
  }, {});

  for (const key of keys) {
    const value = lowered[key.toLowerCase()];
    if (value !== undefined && value !== null) {
      const text = String(value).trim();
      if (text.length > 0) return text;
    }
  }

  return '';
};

interface IExit {
  U_TypeMouv?: string;
}

interface IResult {
  kpis: IModuleKpi[];
  refresh: () => void;
  refreshing: boolean;
}

export const useSortieKpis = (adminWarehouseFilter = ''): IResult => {
  const user = useAuthStore((s) => s.user);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const warehouseCode = user?.isAdmin
    ? adminWarehouseFilter.trim().toUpperCase()
    : (user?.warehouseCode ?? '').trim().toUpperCase();

  const fetch = useCallback(async (): Promise<{ thisMois: number; lastMois: number; topMotif: string }> => {
    // Cas magasin (non-admin ou admin avec filtre): on passe par SQLQueries
    // car certaines versions Service Layer rejettent DocumentLines/any(...)
    if (warehouseCode) {
      const safeWh = escapeSapString(warehouseCode);
      const thisFrom = firstOfMonth();
      const thisTo = lastOfMonth();
      const lastFrom = firstOfMonth(-1);
      const lastTo = lastOfMonth(-1);

      const [thisRes, lastRes, motifRes] = await Promise.allSettled([
        apiClient.post<{ value: Array<Record<string, unknown>> }>(
          ENDPOINTS.SQL_KPI_SORTIE_MOIS_WHS,
          { ParamList: `StartDate='${thisFrom}'&EndDate='${thisTo}'&WhsCode='${safeWh}'` }
        ),
        apiClient.post<{ value: Array<Record<string, unknown>> }>(
          ENDPOINTS.SQL_KPI_SORTIE_MOIS_WHS,
          { ParamList: `StartDate='${lastFrom}'&EndDate='${lastTo}'&WhsCode='${safeWh}'` }
        ),
        apiClient.post<{ value: Array<Record<string, unknown>> }>(
          ENDPOINTS.SQL_KPI_SORTIE_MOTIF_WHS,
          { ParamList: `StartDate='${thisFrom}'&EndDate='${thisTo}'&WhsCode='${safeWh}'` }
        ),
      ]);

      const thisRow =
        thisRes.status === 'fulfilled'
          ? (thisRes.value.data.value?.[0] ?? {})
          : {};
      const lastRow =
        lastRes.status === 'fulfilled'
          ? (lastRes.value.data.value?.[0] ?? {})
          : {};
      const motifRow =
        motifRes.status === 'fulfilled'
          ? (motifRes.value.data.value ?? [])
          : [];

      const topMotif = motifRow.reduce<{ motif: string; nb: number }>(
        (best, row) => {
          const motif = extractSqlText(row, ['TopMotif', 'Motif']);
          const nb = extractSqlMetric(row, ['Nb', 'CountMotif', 'Total']);
          if (!motif) return best;
          if (nb > best.nb) return { motif, nb };
          if (nb === best.nb && nb > 0 && motif.localeCompare(best.motif) < 0) {
            return { motif, nb };
          }
          return best;
        },
        { motif: '', nb: -1 }
      );

      return {
        thisMois: extractSqlMetric(thisRow, ['SortiesMois']),
        lastMois: extractSqlMetric(lastRow, ['SortiesMois']),
        topMotif: topMotif.motif || '-',
      };
    }

    const whFilter = '';

    const [thisRes, lastRes] = await Promise.allSettled([
      apiClient.get(
        `/InventoryGenExits?$filter=DocDate ge '${firstOfMonth()}' and DocDate le '${lastOfMonth()}'${whFilter}` +
          `&$select=DocEntry,U_TypeMouv&$top=500`
      ),
      apiClient.get(
        `/InventoryGenExits?$filter=DocDate ge '${firstOfMonth(-1)}' and DocDate le '${lastOfMonth(-1)}'${whFilter}` +
          `&$inlinecount=allpages&$top=1&$select=DocEntry`
      ),
    ]);

    let thisMois = 0;
    let topMotif = '-';
    if (thisRes.status === 'fulfilled') {
      const rows: IExit[] = thisRes.value.data.value ?? [];
      thisMois = rows.length;

      const counts: Record<string, number> = {};
      rows.forEach((r) => {
        const motif = r.U_TypeMouv ?? 'AUTRE';
        counts[motif] = (counts[motif] ?? 0) + 1;
      });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      topMotif = top ? `${top[0]} (${top[1]})` : '-';
    }

    let lastMois = 0;
    if (lastRes.status === 'fulfilled') {
      const raw = lastRes.value.data['odata.count'];
      lastMois = raw !== undefined ? parseInt(String(raw), 10) || 0 : 0;
    }

    return { thisMois, lastMois, topMotif };
  }, [warehouseCode]);

  const query = useQuery<{ thisMois: number; lastMois: number; topMotif: string }>({
    queryKey: ['kpis', 'sortie', warehouseCode],
    queryFn: fetch,
    staleTime: 2 * 60 * 1000,
  });

  const thisMois = query.data?.thisMois ?? null;
  const lastMois = query.data?.lastMois ?? null;
  const topMotif = query.data?.topMotif ?? null;

  const tendance = (() => {
    if (thisMois === null || lastMois === null) return null;
    if (lastMois === 0) return thisMois > 0 ? 'up' : '-';
    const diff = thisMois - lastMois;
    return diff > 0 ? `up +${diff}` : diff < 0 ? `down ${diff}` : 'stable';
  })();

  const kpis: IModuleKpi[] = [
    {
      label: 'Sorties ce mois',
      value: thisMois,
      icon: 'archive-arrow-up-outline',
      status: thisMois === null ? 'info' : thisMois > 20 ? 'critical' : thisMois > 5 ? 'warning' : 'ok',
      sub: 'Documents',
    },
    {
      label: 'Motif principal',
      value: topMotif,
      icon: 'tag-outline',
      status: 'info',
      sub: 'Ce mois',
    },
    {
      label: 'Tendance',
      value: tendance,
      icon: 'trending-up',
      status:
        tendance === null ? 'info' : tendance.startsWith('up') ? 'critical' : tendance.startsWith('down') ? 'ok' : 'warning',
      sub: 'vs mois precedent',
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
