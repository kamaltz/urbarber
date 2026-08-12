/**
 * FavoritesContext
 * Single source of truth for the current customer's favorite barber IDs.
 * Loaded once per session; Explore, Barber Detail, and Favorites all read
 * and mutate through this context so a toggle in one screen is immediately
 * reflected in the others without a remount/refetch.
 */

import { useAuth } from '@/features/auth/hooks/use-auth';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { customerRepository } from '../repository/customer.repository';

type ToggleResult = { success: boolean; isFavorite: boolean; error?: { message: string } };

type FavoritesContextType = {
  isFavorite: (barberId: string) => boolean;
  toggleFavorite: (barberId: string) => Promise<ToggleResult>;
  loading: boolean;
};

export const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const customerId = user?.uid || '';

  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(Boolean(customerId));

  useEffect(() => {
    let active = true;

    async function load() {
      if (!customerId) {
        setFavoriteIds(new Set());
        setLoading(false);
        return;
      }
      setLoading(true);
      const ids = await customerRepository.getFavoriteIds(customerId);
      if (!active) return;
      setFavoriteIds(new Set(ids));
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [customerId]);

  const isFavorite = useCallback((barberId: string) => favoriteIds.has(barberId), [favoriteIds]);

  const toggleFavorite = useCallback(
    async (barberId: string): Promise<ToggleResult> => {
      if (!customerId || !barberId) {
        return { success: false, isFavorite: false, error: { message: 'ID Pelanggan dan Barber diperlukan' } };
      }

      const wasFavorite = favoriteIds.has(barberId);

      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.delete(barberId);
        else next.add(barberId);
        return next;
      });

      const res = await customerRepository.toggleFavoriteBarber(customerId, barberId);

      if (!res.success) {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (wasFavorite) next.add(barberId);
          else next.delete(barberId);
          return next;
        });
        return res;
      }

      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (res.isFavorite) next.add(barberId);
        else next.delete(barberId);
        return next;
      });

      return res;
    },
    [customerId, favoriteIds]
  );

  return (
    <FavoritesContext.Provider value={{ isFavorite, toggleFavorite, loading }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextType {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
