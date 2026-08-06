/**
 * useCustomerFavorites Hook
 * Manages favorite barbers state with optimistic updates & instant removal
 */

import { useCallback, useEffect, useState } from 'react';
import { customerRepository } from '../repository/customer.repository';
import type { CustomerFavoritesData } from '../types/customer';

export function useCustomerFavorites(customerId: string) {
  const [favoritesData, setFavoritesData] = useState<CustomerFavoritesData | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(customerId));
  const [error, setError] = useState<string | null>(null);

  const fetchFavorites = useCallback(async () => {
    if (!customerId) return;

    try {
      setLoading(true);
      const data = await customerRepository.getFavoriteBarbers(customerId);
      setFavoritesData(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat daftar favorit');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    let active = true;

    async function init() {
      if (!customerId) {
        setLoading(false);
        return;
      }
      await Promise.resolve();
      if (!active) return;
      await fetchFavorites();
    }

    void init();
    return () => {
      active = false;
    };
  }, [customerId, fetchFavorites]);

  const toggleFavorite = useCallback(
    async (barberId: string) => {
      if (!customerId || !barberId) return { success: false, isFavorite: false };

      const prevData = favoritesData;

      setFavoritesData((prev) => {
        if (!prev) return null;
        const exists = prev.favoriteBarbers.some((b) => b.barberId === barberId);
        if (exists) {
          return {
            ...prev,
            favoriteBarbers: prev.favoriteBarbers.filter((b) => b.barberId !== barberId),
          };
        }
        return prev;
      });

      const res = await customerRepository.toggleFavoriteBarber(customerId, barberId);

      if (!res.success) {
        setFavoritesData(prevData);
        return res;
      }

      void fetchFavorites();
      return res;
    },
    [customerId, favoritesData, fetchFavorites]
  );

  return {
    favoritesData,
    loading,
    error,
    toggleFavorite,
    refresh: fetchFavorites,
  };
}
