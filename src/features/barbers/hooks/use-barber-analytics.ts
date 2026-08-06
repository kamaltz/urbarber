/**
 * useBarberAnalytics Hook
 * Manages barber analytics and dashboard state
 */

import { useEffect, useState } from 'react';
import { barberRepository } from '../repository/barber.repository';
import type { BarberAnalytics, BarberDashboardData } from '../types/barber';

export function useBarberAnalytics(barberId: string, period: 'daily' | 'weekly' | 'monthly' = 'monthly') {
  const [analytics, setAnalytics] = useState<BarberAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(barberId));
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!barberId) {
      return;
    }

    let isMounted = true;
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await barberRepository.getBarberAnalytics(barberId, period);
        if (isMounted) setAnalytics(data);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadAnalytics();
    return () => {
      isMounted = false;
    };
  }, [barberId, period]);

  const exportReport = async (format: 'pdf' | 'csv') => {
    if (!barberId) return { success: false };

    try {
      setExporting(true);
      const result = await barberRepository.exportAnalyticsReport(barberId, format);
      return result;
    } catch (err) {
      return { success: false, error: { message: 'Export failed' } };
    } finally {
      setExporting(false);
    }
  };

  const refresh = async () => {
    if (!barberId) return;

    try {
      setLoading(true);
      const data = await barberRepository.getBarberAnalytics(barberId, period);
      setAnalytics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setLoading(false);
    }
  };

  return {
    analytics,
    loading,
    error,
    exporting,
    exportReport,
    refresh,
  };
}

/**
 * useBarberDashboard Hook
 * Manages barber dashboard state (combined profile, bookings, analytics, reviews)
 */
export function useBarberDashboard(barberId: string) {
  const [dashboardData, setDashboardData] = useState<BarberDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(barberId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!barberId) {
      return;
    }

    let isMounted = true;
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await barberRepository.getBarberDashboard(barberId);
        if (isMounted) {
          setDashboardData(data);
          if (!data) {
            setError('Dashboard data not found');
          }
        }
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, [barberId]);

  const refresh = async () => {
    if (!barberId) return;

    try {
      setLoading(true);
      const data = await barberRepository.getBarberDashboard(barberId);
      setDashboardData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setLoading(false);
    }
  };

  return {
    dashboardData,
    loading,
    error,
    refresh,
  };
}
