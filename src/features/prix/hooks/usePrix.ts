import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { prixService } from '../services/prixService';
import type { IUpdatePricePayload } from '../types';

export const usePriceLists = () => {
  return useQuery({
    queryKey: ['priceLists'],
    queryFn: prixService.getPriceLists,
    staleTime: 1000 * 60 * 15, // 15 min
  });
};

export const useItemPrices = (itemCode: string | null | undefined) => {
  return useQuery({
    queryKey: ['itemPrices', itemCode],
    queryFn: () => (itemCode ? prixService.getItemPrices(itemCode) : Promise.resolve([])),
    enabled: Boolean(itemCode),
  });
};

export const useUpdatePrice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: IUpdatePricePayload) => prixService.updateItemPrice(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['itemPrices', variables.itemCode] });
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      Toast.show({
        type: 'success',
        text1: 'Tarif synchronisé dans SAP',
        text2: `Article ${variables.itemCode} mis à jour : ${variables.newPrice.toLocaleString('fr-FR')} F CFA`,
      });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.error?.message?.value ?? error?.message ?? 'Erreur inconnue';
      Toast.show({
        type: 'error',
        text1: 'Échec de la mise à jour SAP',
        text2: msg,
      });
    },
  });
};
