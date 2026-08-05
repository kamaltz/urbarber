/**
 * useAdminDashboard Hook
 * Manages admin dashboard state
 */

import { useAsyncDetail } from '@/hooks/use-async-data';
import { useState } from 'react';
import { adminRepository } from '../repository/admin.repository';
import type { AdminDashboardData } from '../types/admin';

export function useAdminDashboard(adminId: string) {
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);

  const { loading, error, refresh } = useAsyncDetail(
    adminId,
    (id) => adminRepository.getAdminDashboard(id),
    {
      onSuccess: (data) => setDashboardData(data as AdminDashboardData),
    }
  );

  return {
    dashboardData: dashboardData || null,
    loading,
    error,
    refresh,
  };
}
