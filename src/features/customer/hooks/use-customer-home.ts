/**
 * useCustomerHome Hook
 * Manages customer home dashboard state with pull-to-refresh support, plus a
 * one-shot foreground location lookup (same pattern as useCustomerSearch) so
 * the "Barber Terdekat" section can show real distances once granted.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { customerLocationService } from '../services/customer-location.service';
import { customerRepository } from '../repository/customer.repository';
import type { CustomerHomeData } from '../types/customer';
import type { CustomerLocationUiStatus } from './use-customer-search';

export function useCustomerHome(customerId: string) {
  const [homeData, setHomeData] = useState<CustomerHomeData | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(customerId));
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [locationUiStatus, setLocationUiStatus] = useState<CustomerLocationUiStatus>('idle');

  const coordsRef = useRef<{ latitude: number; longitude: number } | null>(null);

  const fetchHome = useCallback(async (isRefresh = false) => {
    if (!customerId) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await customerRepository.getCustomerHomeData(customerId, coordsRef.current || undefined);
      setHomeData(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat beranda');
    } finally {
      setLoading(false);
      setRefreshing(false);
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
      await fetchHome(false);
    }

    void init();
    return () => {
      active = false;
    };
  }, [customerId, fetchHome]);

  useEffect(() => {
    let active = true;

    async function initLocation() {
      if (!customerId) return;
      setLocationUiStatus('requesting');
      const result = await customerLocationService.getCurrentLocation();
      if (!active) return;

      if (result.status === 'granted') {
        coordsRef.current = { latitude: result.latitude, longitude: result.longitude };
        setLocationUiStatus('granted');
        // Refine the already-loaded (no-distance) nearest section now that a real position exists.
        await fetchHome(false);
      } else {
        coordsRef.current = null;
        setLocationUiStatus(result.status);
      }
    }

    void initLocation();
    return () => {
      active = false;
    };
    // Runs once per customerId, same rationale as useCustomerSearch: never
    // re-triggers the OS permission dialog on every refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const requestLocation = useCallback(async () => {
    if (!customerId) return;
    setLocationUiStatus('requesting');
    const result = await customerLocationService.getCurrentLocation();

    if (result.status === 'granted') {
      coordsRef.current = { latitude: result.latitude, longitude: result.longitude };
      setLocationUiStatus('granted');
    } else {
      coordsRef.current = null;
      setLocationUiStatus(result.status);
    }
    await fetchHome(false);
  }, [customerId, fetchHome]);

  return {
    homeData,
    loading,
    refreshing,
    error,
    locationUiStatus,
    requestLocation,
    refresh: () => fetchHome(true),
  };
}
