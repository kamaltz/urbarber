/**
 * useCustomerHome Hook
 * Manages customer home dashboard state with pull-to-refresh support
 */

import { useCallback, useEffect, useState } from 'react';
import { customerRepository } from '../repository/customer.repository';
import type { CustomerHomeData } from '../types/customer';

export function useCustomerHome(customerId: string) {
  const [homeData, setHomeData] = useState<CustomerHomeData | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(customerId));
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHome = useCallback(async (isRefresh = false) => {
    if (!customerId) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await customerRepository.getCustomerHomeData(customerId);
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

  return {
    homeData,
    loading,
    refreshing,
    error,
    refresh: () => fetchHome(true),
  };
}
