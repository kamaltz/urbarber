/**
 * useCustomerNotifications Hook
 * Manages customer notifications state
 */

import { useAsyncDetail } from '@/hooks/use-async-data';
import { useCallback, useState } from 'react';
import { customerRepository } from '../repository/customer.repository';
import type { CustomerNotification } from '../types/customer';

export function useCustomerNotifications(customerId: string) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);

  const { loading, error, refresh: refetchNotifications } = useAsyncDetail(
    customerId,
    async (id) => {
      const data = await customerRepository.getNotifications(id);
      setNotifications(data);
      const count = await customerRepository.getUnreadNotificationCount(id);
      setUnreadCount(count);
      return data;
    }
  );

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!customerId) return { success: false };

      try {
        const result = await customerRepository.markNotificationAsRead(customerId, notificationId);

        if (result.success) {
          setNotifications((prev) =>
            prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
          );
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }

        return result;
      } catch (err) {
        return { success: false };
      }
    },
    [customerId]
  );

  return {
    notifications,
    loading,
    error,
    unreadCount,
    markAsRead,
    refresh: refetchNotifications,
  };
}
