/**
 * useCustomerFavorites Hook
 * Manages favorite barbers state
 */

import { useAsyncDetail } from '@/hooks/use-async-data';
import { useCallback } from 'react';
import { customerRepository } from '../repository/customer.repository';

export function useCustomerFavorites(customerId: string) {
  const { data: favoritesData, loading, error, refresh } = useAsyncDetail(
    customerId,
    (id) => customerRepository.getFavoriteBarbers(id)
  );

  const toggleFavorite = useCallback(
    async (barberId: string) => {
      if (!customerId) return { success: false, isFavorite: false };

      try {
        const result = await customerRepository.toggleFavoriteBarber(customerId, barberId);
        await refresh();
        return result;
      } catch (err) {
        return { success: false, isFavorite: false };
      }
    },
    [customerId, refresh]
  );

  return {
    favoritesData: favoritesData || null,
    loading,
    error,
    toggleFavorite,
    refresh,
  };
}
