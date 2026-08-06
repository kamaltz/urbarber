/**
 * useAdminAnalytics and useSystemHealth Hooks
 * Manages analytics and system health monitoring
 */

import { useEffect, useState } from 'react';
import { adminRepository } from '../repository/admin.repository';
import type { AdminAnalyticsData, SystemHealthData } from '../types/admin';

/**
 * useAdminAnalytics Hook
 * Manages admin analytics data
 */
export function useAdminAnalytics(
  adminId: string,
  period: 'daily' | 'weekly' | 'monthly' = 'monthly'
) {
  const [analytics, setAnalytics] = useState<AdminAnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(adminId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!adminId) {
      return;
    }

    let isMounted = true;
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await adminRepository.getAdminAnalytics(adminId, period);
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
  }, [adminId, period]);

  const refresh = async () => {
    if (!adminId) return;

    try {
      setLoading(true);
      const data = await adminRepository.getAdminAnalytics(adminId, period);
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
    refresh,
  };
}

/**
 * useSystemHealth Hook
 * Monitors system health status
 */
export function useSystemHealth(adminId: string) {
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(adminId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!adminId) {
      return;
    }

    let isMounted = true;
    const loadHealth = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await adminRepository.getSystemHealth(adminId);
        if (isMounted) setHealthData(data);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to load system health');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadHealth();
    return () => {
      isMounted = false;
    };
  }, [adminId]);

  const refresh = async () => {
    if (!adminId) return;

    try {
      setLoading(true);
      const data = await adminRepository.getSystemHealth(adminId);
      setHealthData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setLoading(false);
    }
  };

  return {
    healthData,
    loading,
    error,
    refresh,
  };
}
