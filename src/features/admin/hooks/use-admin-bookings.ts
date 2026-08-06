/**
 * useAdminBookings Hook
 * Manages booking verification and flagging
 */

import { useEffect, useState } from 'react';
import { adminRepository } from '../repository/admin.repository';
import type { BookingFlagRequest, BookingForVerification } from '../types/admin';

export function useAdminBookings(adminId: string, status?: string) {
  const [bookings, setBookings] = useState<BookingForVerification[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(adminId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!adminId) {
      return;
    }

    let isMounted = true;
    const loadBookings = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await adminRepository.getBookingsForVerification(adminId, status);
        if (isMounted) setBookings(data);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to load bookings');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadBookings();
    return () => {
      isMounted = false;
    };
  }, [adminId, status]);

  const flagBooking = async (data: BookingFlagRequest) => {
    if (!adminId) return { success: false };

    try {
      const result = await adminRepository.updateBookingFlag(adminId, data);

      if (result.success) {
        setBookings((prev) =>
          prev.map((b) =>
            b.bookingId === data.bookingId
              ? {
                  ...b,
                  verificationStatus: data.flag ? 'flagged' : 'verified',
                  flaggedReason: data.reason,
                }
              : b
          )
        );
      }

      return result;
    } catch {
      return { success: false, error: { message: 'Flag update failed' } };
    }
  };

  const refresh = async () => {
    if (!adminId) return;

    try {
      setLoading(true);
      const data = await adminRepository.getBookingsForVerification(adminId, status);
      setBookings(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setLoading(false);
    }
  };

  return {
    bookings,
    loading,
    error,
    flagBooking,
    refresh,
  };
}
