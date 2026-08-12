/**
 * useCustomerFavorites Hook
 * Manages favorite barbers state with optimistic updates & instant removal
 */

import { useCallback, useEffect, useState } from 'react';
import { useFavorites } from '../context/favorites-context';
import { customerRepository } from '../repository/customer.repository';
import type { CustomerFavoritesData } from '../types/customer';

export function useCustomerFavorites(customerId: string) {
  const favorites = useFavorites();
  const [favoritesData, setFavoritesData] = useState<CustomerFavoritesData | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(customerId));
  const [error, setError] = useState<string | null>(null);

  // React Navigation's back() re-shows this screen without remounting it, so a
  // favorite removed from Detail/Explore while this screen was merely backgrounded
  // (not refetched) would otherwise keep showing here. Prune reactively against the
  // shared context -- isFavorite's identity changes whenever the underlying Set does.
  useEffect(() => {
    setFavoritesData((prev) => {
      if (!prev) return prev;
      const stillFavorited = prev.favoriteBarbers.filter((b) => favorites.isFavorite(b.barberId));
      if (stillFavorited.length === prev.favoriteBarbers.length) return prev;
      return { ...prev, favoriteBarbers: stillFavorited };
    });
  }, [favorites.isFavorite]);

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

      const res = await favorites.toggleFavorite(barberId);

      if (!res.success) {
        setFavoritesData(prevData);
        return res;
      }

      void fetchFavorites();
      return res;
    },
    [customerId, favoritesData, favorites, fetchFavorites]
  );

  return {
    favoritesData,
    loading,
    error,
    toggleFavorite,
    refresh: fetchFavorites,
  };
}
