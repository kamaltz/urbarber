/**
 * useCustomerHome Hook
 * Manages customer home dashboard state
 */

import { useEffect, useState } from 'react';
import { customerRepository } from '../repository/customer.repository';
import type { CustomerHomeData } from '../types/customer';

export function useCustomerHome(customerId: string) {
  const [homeData, setHomeData] = useState<CustomerHomeData | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(customerId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) {
      return;
    }

    let isMounted = true;

    const loadHomeData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await customerRepository.getCustomerHomeData(customerId);
        if (isMounted) {
          setHomeData(data);
          if (!data) {
            setError('Home data not found');
          }
        }
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to load home data');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadHomeData();
    return () => {
      isMounted = false;
    };
  }, [customerId]);

  const refresh = async () => {
    if (!customerId) return;

    try {
      setLoading(true);
      const data = await customerRepository.getCustomerHomeData(customerId);
      setHomeData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setLoading(false);
    }
  };

  return {
    homeData,
    loading,
    error,
    refresh,
  };
}
