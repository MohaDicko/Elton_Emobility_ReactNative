// ─── Service Entrepôts SAP B1 ────────────────────────────────────────────────
import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import type { IWarehouse } from '@shared/types';
import type { ISapResponse } from '@shared/types';

/** Récupère tous les entrepôts actifs depuis SAP */
const getAll = async (): Promise<IWarehouse[]> => {
  type IWarehousesPage = ISapResponse<IWarehouse> & { 'odata.nextLink'?: string };

  const all: IWarehouse[] = [];
  const firstPage = await apiClient.get<IWarehousesPage>(ENDPOINTS.WAREHOUSES);
  all.push(...firstPage.data.value);

  let nextLink: string | undefined = firstPage.data['odata.nextLink'];
  while (nextLink) {
    const nextPage = await apiClient.get<IWarehousesPage>(nextLink);
    all.push(...nextPage.data.value);
    nextLink = nextPage.data['odata.nextLink'];
  }

  return all;
};

export const warehouseService = {
  getAll,
};
