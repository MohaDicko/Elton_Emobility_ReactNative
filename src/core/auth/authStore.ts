import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { sapAuth } from '../api/sapAuth';
import { apiClient, setUnauthorizedHandler } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';
import { sha256Hex } from '../utils/crypto';

const APP_USER_KEY = 'GA_APP_USER';

export interface IUserInfo {
  userCode: string;
  userName: string;
  companyDB?: string;
  isAdmin: boolean;
  mustChangePwd: boolean;
  isResetMode?: boolean;
  warehouseCode?: string;
}

interface IAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: IUserInfo | null;
  error: string | null;

  login: (userCode: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  clearError: () => void;
}

interface IAuthUserRow {
  Code: string;
  Name: string;
  U_IsAdmin: string;
  U_MustChangePwd: string;
  U_WhsCode?: string;
}

interface IResetRow {
  Code: string;
  Name: string;
  U_IsAdmin: string;
  U_ResetUntil: string;
}

const fetchUserWarehouse = async (code: string): Promise<string | undefined> => {
  try {
    const { data } = await apiClient.get<{ U_WhsCode?: string }>(ENDPOINTS.GA_USER_BY_CODE(code));
    const value = (data.U_WhsCode ?? '').trim();
    return value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
};

const fetchResetRows = async (safeCode: string): Promise<IResetRow[]> => {
  try {
    const named = await apiClient.post<{ value: IResetRow[] }>(
      ENDPOINTS.SQL_RESET_ADMIN,
      { ParamList: `UserCode='${safeCode}'` }
    );
    let rows = named.data.value ?? [];

    if (rows.length === 0) {
      const positional = await apiClient.post<{ value: IResetRow[] }>(
        ENDPOINTS.SQL_RESET_ADMIN,
        { ParamList: `${safeCode}` }
      );
      rows = positional.data.value ?? [];
    }

    if (rows.length === 0) {
      const positionalQuoted = await apiClient.post<{ value: IResetRow[] }>(
        ENDPOINTS.SQL_RESET_ADMIN,
        { ParamList: `'${safeCode}'` }
      );
      rows = positionalQuoted.data.value ?? [];
    }

    return rows;
  } catch {
    throw new Error('Configuration SQL GA_RESET_ADMIN invalide (ParamList nomme vs positionnel).');
  }
};

export const useAuthStore = create<IAuthState>((set) => ({
  isAuthenticated: false,
  isLoading: false,
  user: null,
  error: null,

  login: async (userCode: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const hashedPwd = await sha256Hex(password);
      const safeCode = userCode.replace(/'/g, '');

      const { data } = await apiClient.post<{ value: IAuthUserRow[] }>(
        ENDPOINTS.SQL_AUTH_USER,
        { ParamList: `UserCode='${safeCode}'&HashedPwd='${hashedPwd}'` }
      );

      if (!data.value || data.value.length === 0) {
        if (password !== '12345678') {
          throw new Error('Identifiants incorrects');
        }

        const resetRows = await fetchResetRows(safeCode);
        if (resetRows.length === 0) {
          throw new Error('Identifiants incorrects');
        }

        const resetUser = resetRows[0];
        const rawExpiry = (resetUser.U_ResetUntil ?? '').trim();
        if (rawExpiry) {
          const expiry = new Date(rawExpiry.includes('T') ? rawExpiry : rawExpiry.replace(' ', 'T'));
          if (!Number.isNaN(expiry.getTime()) && expiry < new Date()) {
            throw new Error('La fenetre de recuperation a expire. Reactivez U_ResetBySAP dans SAP.');
          }
        }

        const resetIsAdmin = resetUser.U_IsAdmin === 'Y';
        const resetWarehouse = resetIsAdmin ? undefined : await fetchUserWarehouse(resetUser.Code);
        if (!resetIsAdmin && !resetWarehouse) {
          throw new Error('Aucun magasin attribue a votre compte. Contactez un administrateur.');
        }

        const resetAppUser: IUserInfo = {
          userCode: resetUser.Code,
          userName: resetUser.Name,
          isAdmin: resetIsAdmin,
          mustChangePwd: true,
          isResetMode: true,
          warehouseCode: resetWarehouse,
        };

        await apiClient.patch(ENDPOINTS.GA_USER_BY_CODE(resetUser.Code), {
          U_ResetBySAP: 'N',
          U_MustChangePwd: 'Y',
        }).catch(() => {});

        set({ isAuthenticated: true, isLoading: false, user: resetAppUser });
        return;
      }

      const row = data.value[0];
      const isAdmin = row.U_IsAdmin === 'Y';
      const assignedWarehouse = ((row.U_WhsCode ?? '').trim() || await fetchUserWarehouse(row.Code));
      if (!isAdmin && !assignedWarehouse) {
        throw new Error('Aucun magasin attribue a votre compte. Contactez un administrateur.');
      }

      const appUser: IUserInfo = {
        userCode: row.Code,
        userName: row.Name,
        isAdmin,
        mustChangePwd: row.U_MustChangePwd === 'Y',
        warehouseCode: isAdmin ? undefined : assignedWarehouse,
      };

      set({ isAuthenticated: true, isLoading: false, user: appUser });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de connexion';
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(APP_USER_KEY);
    set({ isAuthenticated: false, isLoading: false, user: null, error: null });
  },

  restoreSession: async () => {
    set({ isLoading: true });
    try {
      await sapAuth.restoreSession();
      await SecureStore.deleteItemAsync(APP_USER_KEY).catch(() => {});
    } finally {
      set({ isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));

setUnauthorizedHandler(() => useAuthStore.getState().logout());
