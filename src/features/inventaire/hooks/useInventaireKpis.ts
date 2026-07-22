import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import { useAuthStore } from '@core/auth/authStore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { IModuleKpi } from '@shared/components/ui/ModuleKpiStrip';

const extractCount = (data: Record<string, unknown>): number => {
  const raw = data['odata.count'];
  return raw !== undefined ? parseInt(String(raw), 10) || 0 : (data.value as unknown[])?.length ?? 0;
};

interface IResult { kpis: IModuleKpi[]; refresh: () => void; refreshing: boolean }

const escapeSapString = (value: string): string => value.replace(/'/g, "''");
const toInt = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

const pickMetric = (row: Record<string, unknown>, keys: string[]): number => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) {
      return toInt(row[key]);
    }
  }

  const lowered = Object.keys(row).reduce<Record<string, unknown>>((acc, k) => {
    acc[k.toLowerCase()] = row[k];
    return acc;
  }, {});

  for (const key of keys) {
    const value = lowered[key.toLowerCase()];
    if (value !== undefined && value !== null) {
      return toInt(value);
    }
  }

  return 0;
};

const toDisplayDate = (raw: string): string => {
  const text = raw.trim();
  if (!text) return 'Jamais';

  // SAP SQLQuery peut renvoyer CountDate en YYYYMMDD
  if (/^\d{8}$/.test(text)) {
    const iso = `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
    try {
      return format(new Date(iso), 'd MMM yyyy', { locale: fr });
    } catch {
      return iso;
    }
  }

  try {
    return format(new Date(text), 'd MMM yyyy', { locale: fr });
  } catch {
    return text.slice(0, 10);
  }
};

export const useInventaireKpis = (adminWarehouseFilter = ''): IResult => {
  const user = useAuthStore((s) => s.user);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const warehouseCode = user?.isAdmin
    ? adminWarehouseFilter.trim().toUpperCase()
    : (user?.warehouseCode ?? '').trim().toUpperCase();

  const fetch = useCallback(async (): Promise<{ lastDoc: string; lastDate: string; openCount: number }> => {
    if (warehouseCode) {
      const safeWh = escapeSapString(warehouseCode);
      const params = `WhsCode='${safeWh}'`;

      const [lastRes, openRes] = await Promise.allSettled([
        apiClient.post<{ value: Array<Record<string, unknown>> }>(
          ENDPOINTS.SQL_KPI_INVENTAIRE_LAST_DOC_WHS,
          { ParamList: params }
        ),
        apiClient.post<{ value: Array<Record<string, unknown>> }>(
          ENDPOINTS.SQL_KPI_INVENTAIRE_OPEN_WHS,
          { ParamList: params }
        ),
      ]);

      let lastDoc = '-';
      let lastDate = 'Jamais';
      if (lastRes.status === 'fulfilled') {
        const row = lastRes.value.data.value?.[0] ?? {};
        const doc = pickMetric(row, ['DocumentNumber', 'DocNum', 'LastDocNum']);
        if (doc > 0) lastDoc = String(doc);
        const rawDate = String(
          row.CountDate ?? row.DocDate ?? row.LastDate ?? ''
        ).trim();
        if (rawDate) lastDate = toDisplayDate(rawDate);
      }

      const openCount = openRes.status === 'fulfilled'
        ? pickMetric(openRes.value.data.value?.[0] ?? {}, ['OpenDocs', 'OpenCount', 'CountOpen'])
        : 0;

      return { lastDoc, lastDate, openCount };
    }

    const [lastRes, openRes] = await Promise.allSettled([
      apiClient.get(
        `/InventoryCountings?$orderby=CountDate desc&$top=1&$select=DocumentEntry,DocumentNumber,CountDate,DocumentStatus`
      ),
      apiClient.get(
        `/InventoryCountings?$filter=DocumentStatus eq 'cdsOpen'` +
        `&$inlinecount=allpages&$top=1&$select=DocumentEntry`
      ),
    ]);

    let lastDoc = '-';
    let lastDate = 'Jamais';
    if (lastRes.status === 'fulfilled') {
      const rows = lastRes.value.data.value ?? [];
      if (rows.length > 0) {
        const row = rows[0];
        if (row.DocumentNumber !== undefined && row.DocumentNumber !== null) {
          lastDoc = String(row.DocumentNumber);
        }
      }
      if (rows.length > 0 && rows[0].CountDate) {
        try {
          const d = new Date(rows[0].CountDate);
          lastDate = format(d, 'd MMM yyyy', { locale: fr });
        } catch {
          lastDate = rows[0].CountDate.slice(0, 10);
        }
      }
    }

    const openCount = openRes.status === 'fulfilled' ? extractCount(openRes.value.data) : 0;
    return { lastDoc, lastDate, openCount };
  }, [warehouseCode]);

  const query = useQuery<{ lastDoc: string; lastDate: string; openCount: number }>({
    queryKey: ['kpis', 'inventaire', warehouseCode],
    queryFn: fetch,
    staleTime: 2 * 60 * 1000,
  });

  const lastDoc = query.data?.lastDoc ?? null;
  const lastDate = query.data?.lastDate ?? null;
  const openCount = query.data?.openCount ?? null;

  const kpis: IModuleKpi[] = [
    {
      label:  'Dernier document',
      value:  lastDoc,
      icon:   'file-document-outline',
      status: 'info',
      sub:    lastDate ? `Date: ${lastDate}` : 'Date indisponible',
    },
    {
      label:  'Documents ouverts',
      value:  openCount,
      icon:   'clipboard-list-outline',
      status: openCount === null ? 'info' : openCount > 0 ? 'warning' : 'ok',
      sub:    'A finaliser',
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
