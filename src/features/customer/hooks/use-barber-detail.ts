/**
 * useBarberDetail Hook
 * Fetches barber detail, offered services, and manages favorite state
 */

import { barberRepository } from '@/features/barbers/repository/barber.repository';
import { galleryRepository } from '@/features/barbers/repository/gallery.repository';
import type { BarberGalleryImage, BarberService } from '@/features/barbers/types/barber';
import { useCallback, useEffect, useState } from 'react';
import { useFavorites } from '../context/favorites-context';
import { customerRepository } from '../repository/customer.repository';
import type { PublicBarberSummary } from '../types/customer';

export function useBarberDetail(barberId: string) {
  const favorites = useFavorites();
  const [barber, setBarber] = useState<PublicBarberSummary | null>(null);
  const [services, setServices] = useState<BarberService[]>([]);
  const [gallery, setGallery] = useState<BarberGalleryImage[]>([]);
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
        setGallery([]);
        setError('Barber tidak ditemukan atau sedang tidak aktif.');
        return;
      }

      setBarber(targetBarber);

      const [rawServices, galleryImages] = await Promise.all([
        barberRepository.getBarberServices(barberId, true),
        galleryRepository.getGallery(barberId),
      ]);
      const activeServices = (rawServices || []).filter((s) => s.isActive !== false);
      setServices(activeServices);
      setGallery(galleryImages);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat detail barber.');
    } finally {
      setLoading(false);
    }
  }, [barberId]);

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
    if (!barberId) return;
    await favorites.toggleFavorite(barberId);
  }, [barberId, favorites]);

  return {
    barber,
    services,
    gallery,
    isFavorite: favorites.isFavorite(barberId),
    loading,
    error,
    toggleFavorite,
    refresh: fetchDetail,
  };
}
