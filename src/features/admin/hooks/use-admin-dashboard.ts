/**
 * useAdminDashboard Hook
 * Manages admin dashboard state
 */

import { useState } from 'react';
import { useAsyncDetail } from '@/hooks/use-async-data';
import { adminRepository } from '../repository/admin.repository';
import type { AdminDashboardData } from '../types/admin';

export function useAdminDashboard(adminId: string) {
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);

  const { loading, error, refresh } = useAsyncDetail(
    adminId,
    (id) => adminRepository.getAdminDashboard(id),
    {
      onSuccess: (data) => setDashboardData(data),
    }
  );

  return {
    dashboardData: dashboardData || null,
    loading,
    error,
    refresh,
  };
}
