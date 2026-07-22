import { apiClient } from '@core/api/client';
import { ENDPOINTS } from '@core/api/endpoints';
import { sha256Hex } from '@core/utils/crypto';
import type { ISapResponse } from '@shared/types';

export interface IGaUser {
  Code: string;
  Name: string;
  U_Active: 'Y' | 'N';
  U_IsAdmin: 'Y' | 'N';
  U_WhsCode?: string;
}

const normalizeWarehouse = (warehouseCode?: string): string | undefined => {
  const value = (warehouseCode ?? '').trim().toUpperCase();
  return value.length > 0 ? value : undefined;
};

const getUsers = async (): Promise<IGaUser[]> => {
  try {
    const { data } = await apiClient.get<ISapResponse<IGaUser>>(ENDPOINTS.GA_USERS);
    return (data.value ?? []).sort((a, b) => a.Code.localeCompare(b.Code));
  } catch {
    const { data } = await apiClient.post<{ value: IGaUser[] }>(ENDPOINTS.SQL_LIST_USERS, {});
    return (data.value ?? []).sort((a, b) => a.Code.localeCompare(b.Code));
  }
};

const createUser = async (
  code: string,
  name: string,
  plainPassword: string,
  isAdmin = false,
  warehouseCode?: string,
): Promise<IGaUser> => {
  const safeCode = code.replace(/'/g, '');
  const hashedPwd = await sha256Hex(plainPassword);
  const normalizedWhs = normalizeWarehouse(warehouseCode);
  if (!isAdmin && !normalizedWhs) {
    throw new Error('Magasin obligatoire pour un non-admin.');
  }

  const { data } = await apiClient.post<IGaUser>(ENDPOINTS.GA_USERS, {
    Code: safeCode,
    Name: name.trim(),
    U_Password: hashedPwd,
    U_Active: 'Y',
    U_IsAdmin: isAdmin ? 'Y' : 'N',
    U_MustChangePwd: 'Y',
    ...(normalizedWhs ? { U_WhsCode: normalizedWhs } : {}),
  });
  return data;
};

const toggleUserActive = async (code: string, currentActive: 'Y' | 'N'): Promise<void> => {
  await apiClient.patch(ENDPOINTS.GA_USER_BY_CODE(code), {
    U_Active: currentActive === 'Y' ? 'N' : 'Y',
  });
};

const updateUserWarehouse = async (code: string, warehouseCode?: string): Promise<void> => {
  const normalizedWhs = normalizeWarehouse(warehouseCode);
  await apiClient.patch(ENDPOINTS.GA_USER_BY_CODE(code), {
    U_WhsCode: normalizedWhs ?? '',
  });
};

const deleteUser = async (code: string): Promise<void> => {
  await apiClient.delete(ENDPOINTS.GA_USER_BY_CODE(code));
};

const resetPassword = async (code: string, newPlainPassword: string): Promise<void> => {
  const hashedPwd = await sha256Hex(newPlainPassword);
  await apiClient.patch(ENDPOINTS.GA_USER_BY_CODE(code), {
    U_Password: hashedPwd,
    U_MustChangePwd: 'Y',
  });
};

const changeOwnPassword = async (
  code: string,
  newPlainPassword: string,
  clearReset = false,
): Promise<void> => {
  const hashedPwd = await sha256Hex(newPlainPassword);
  await apiClient.patch(ENDPOINTS.GA_USER_BY_CODE(code), {
    U_Password: hashedPwd,
    U_MustChangePwd: 'N',
    ...(clearReset && { U_ResetBySAP: 'N', U_ResetUntil: '' }),
  });
};

export const adminService = {
  getUsers,
  createUser,
  toggleUserActive,
  updateUserWarehouse,
  deleteUser,
  resetPassword,
  changeOwnPassword,
};
