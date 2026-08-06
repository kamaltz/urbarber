/**
 * useBarberServices Hook
 * Manages barber services state
 */

import { useEffect, useState } from 'react';
import { barberRepository } from '../repository/barber.repository';
import type { BarberAddServiceRequest, BarberService } from '../types/barber';

export function useBarberServices(barberId: string) {
  const [services, setServices] = useState<BarberService[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(barberId));
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!barberId) {
      return;
    }

    let isMounted = true;
    const loadServices = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await barberRepository.getBarberServices(barberId);
        if (isMounted) setServices(data);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to load services');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadServices();
    return () => {
      isMounted = false;
    };
  }, [barberId]);

  const addService = async (data: BarberAddServiceRequest) => {
    if (!barberId) return { success: false };

    try {
      setAdding(true);
      const result = await barberRepository.addBarberService(barberId, data);

      if (result.success && result.serviceId) {
        const newService: BarberService = {
          serviceId: result.serviceId,
          name: data.name,
          description: data.description,
          price: data.price,
          durationMinutes: data.durationMinutes,
          imageUrl: data.imageUrl,
          isActive: true,
          createdAt: new Date().toISOString(),
        };

        setServices((prev) => [...prev, newService]);
      }

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Add service failed';
      setError(errorMsg);
      return { success: false, error: { message: errorMsg } };
    } finally {
      setAdding(false);
    }
  };

  const refresh = async () => {
    if (!barberId) return;

    try {
      setLoading(true);
      const data = await barberRepository.getBarberServices(barberId);
      setServices(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setLoading(false);
    }
  };

  return {
    services,
    loading,
    error,
    adding,
    addService,
    refresh,
  };
}
