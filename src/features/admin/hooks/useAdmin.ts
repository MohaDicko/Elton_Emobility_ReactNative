import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { adminService, type IGaUser } from '../services/adminService';
import { extractSapErrorMessage } from '@shared/utils';

export const useAdminUsers = () => {
  return useQuery<IGaUser[]>({
    queryKey: ['admin', 'users'],
    queryFn: adminService.getUsers,
    staleTime: 30_000,
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      code,
      name,
      password,
      isAdmin,
      warehouseCode,
    }: {
      code: string;
      name: string;
      password: string;
      isAdmin: boolean;
      warehouseCode?: string;
    }) => {
      const normalizedWhs = (warehouseCode ?? '').trim().toUpperCase();
      if (!isAdmin && !normalizedWhs) {
        throw new Error('Magasin obligatoire pour un non-admin.');
      }
      return adminService.createUser(code, name, password, isAdmin, normalizedWhs || undefined);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      Toast.show({
        type: 'success',
        text1: 'Utilisateur cree',
        text2: `${vars.code} - ${vars.name}`,
      });
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Erreur creation',
        text2: extractSapErrorMessage(error),
      });
    },
  });
};

export const useToggleUserActive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      code,
      currentActive,
    }: {
      code: string;
      currentActive: 'Y' | 'N';
    }) => adminService.toggleUserActive(code, currentActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Erreur mise a jour',
        text2: extractSapErrorMessage(error),
      });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ code }: { code: string }) => adminService.deleteUser(code),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      Toast.show({
        type: 'success',
        text1: 'Utilisateur supprime',
        text2: vars.code,
      });
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Erreur suppression',
        text2: extractSapErrorMessage(error),
      });
    },
  });
};

export const useUpdateUserWarehouse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      code,
      warehouseCode,
    }: {
      code: string;
      warehouseCode?: string;
    }) => adminService.updateUserWarehouse(code, warehouseCode),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      Toast.show({
        type: 'success',
        text1: 'Magasin mis a jour',
        text2: vars.warehouseCode ? `${vars.code} -> ${vars.warehouseCode}` : `${vars.code} sans magasin`,
      });
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Erreur mise a jour magasin',
        text2: extractSapErrorMessage(error),
      });
    },
  });
};

export const useResetPassword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      code,
      newPassword,
    }: {
      code: string;
      newPassword: string;
    }) => adminService.resetPassword(code, newPassword),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      Toast.show({
        type: 'success',
        text1: 'Mot de passe reinitialise',
        text2: `Compte ${vars.code}`,
      });
    },
    onError: (error: Error) => {
      Toast.show({
        type: 'error',
        text1: 'Erreur reinitialisation',
        text2: extractSapErrorMessage(error),
      });
    },
  });
};
