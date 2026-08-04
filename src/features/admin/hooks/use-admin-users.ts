/**
 * useAdminUsers Hook
 * Manages system users and verification
 */

import { useAsyncDetail } from '@/hooks/use-async-data';
import { useState } from 'react';
import { adminRepository } from '../repository/admin.repository';
import type { SystemUser, UserManagementSummary, UserVerificationRequest } from '../types/admin';

export function useAdminUsers(adminId: string, role?: string, status?: string) {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [summary, setSummary] = useState<UserManagementSummary | null>(null);

  const { loading, error, refresh } = useAsyncDetail(
    adminId,
    async (id) => {
      const [usersData, summaryData] = await Promise.all([
        adminRepository.getSystemUsers(id, role, status),
        adminRepository.getUserManagementSummary(id),
      ]);
      setUsers(usersData);
      setSummary(summaryData);
      return usersData;
    },
    { skip: !adminId }
  );

  const verifyUser = async (data: UserVerificationRequest) => {
    if (!adminId) return { success: false };

    try {
      const result = await adminRepository.verifyUser(adminId, data);

      if (result.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.userId === data.userId
              ? {
                  ...u,
                  verificationStatus: data.approve ? 'approved' : 'rejected',
                }
              : u
          )
        );
      }
      return result;
    } catch (err) {
      return { success: false };
    }
  };

  return {
    users,
    summary,
    loading,
    error,
    verifyUser,
    refresh,
  };
}
