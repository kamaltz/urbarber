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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!adminId) {
      setLoading(false);
      return;
    }

    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await adminRepository.getAdminAnalytics(adminId, period);
        setAnalytics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!adminId) {
      setLoading(false);
      return;
    }

    const loadHealth = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await adminRepository.getSystemHealth(adminId);
        setHealthData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load system health');
      } finally {
        setLoading(false);
      }
    };

    loadHealth();
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
