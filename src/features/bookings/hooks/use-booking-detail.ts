/**
 * Hook for managing booking detail state
 */

import { useAsyncDetail } from '@/hooks/use-async-data';
import { useCallback, useState } from 'react';
import { bookingRepository } from '../repository/booking.repository';
import type { Booking } from '../types/booking';

export function useBookingDetail(bookingId: string) {
  const [booking, setBooking] = useState<Booking | null>(null);

  const { loading, error, refresh } = useAsyncDetail(
    bookingId,
    (id) => bookingRepository.getBookingDetail(id),
    {
      onSuccess: (data) => setBooking(data as Booking),
    }
  );

  const cancelBooking = useCallback(async () => {
    try {
      const result = await bookingRepository.cancelBooking(bookingId);

      if (result.success) {
        setBooking((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
        return { success: true };
      } else {
        return result;
      }
    } catch (err) {
      return {
        success: false,
        error: { message: 'Gagal membatalkan booking' },
      };
    }
  }, [bookingId]);

  return {
    booking: booking || null,
    loading,
    error,
    refresh,
    cancelBooking,
  };
}
