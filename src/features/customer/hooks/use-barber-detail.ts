/**
 * useBarberDetail Hook
 * Fetches barber detail, offered services, and manages favorite state
 */

import { barberRepository } from '@/features/barbers/repository/barber.repository';
import type { BarberService } from '@/features/barbers/types/barber';
import { useCallback, useEffect, useState } from 'react';
import { customerRepository } from '../repository/customer.repository';
import type { PublicBarberSummary } from '../types/customer';

export function useBarberDetail(barberId: string, customerId?: string) {
  const [barber, setBarber] = useState<PublicBarberSummary | null>(null);
  const [services, setServices] = useState<BarberService[]>([]);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(Boolean(barberId));
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!barberId) return;

    try {
      setLoading(true);
      const publicBarbers = await customerRepository.getPublicBarbers();
      const targetBarber = publicBarbers.find((b) => b.id === barberId);

      if (!targetBarber) {
        setBarber(null);
        setServices([]);
        setError('Barber tidak ditemukan atau sedang tidak aktif.');
        return;
      }

      setBarber(targetBarber);

      const rawServices = await barberRepository.getBarberServices(barberId);
      const activeServices = (rawServices || []).filter((s) => s.isActive !== false);
      setServices(activeServices);

      if (customerId) {
        const fav = await customerRepository.isFavorite(customerId, barberId);
        setIsFavorite(fav);
      }
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat detail barber.');
    } finally {
      setLoading(false);
    }
  }, [barberId, customerId]);

  useEffect(() => {
    let active = true;

    async function init() {
      if (!barberId) {
        setLoading(false);
        return;
      }
      // Ensure we hit async microtask before state updates
      await Promise.resolve();
      if (!active) return;
      await fetchDetail();
    }

    void init();
    return () => {
      active = false;
    };
  }, [barberId, fetchDetail]);

  const toggleFavorite = useCallback(async () => {
    if (!customerId || !barberId) return;

    const prev = isFavorite;
    setIsFavorite(!prev);

    const res = await customerRepository.toggleFavoriteBarber(customerId, barberId);
    if (!res.success) {
      setIsFavorite(prev);
    } else {
      setIsFavorite(res.isFavorite);
    }
  }, [customerId, barberId, isFavorite]);

  return {
    barber,
    services,
    isFavorite,
    loading,
    error,
    toggleFavorite,
    refresh: fetchDetail,
  };
}
