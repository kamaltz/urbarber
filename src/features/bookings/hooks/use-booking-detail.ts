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

      // Deliberately NOT updating local state optimistically: mutating this screen's
      // view tree while the caller is also navigating away crashes Fabric on Android
      // ("addViewAt: child already has a parent"). The caller defers navigation via
      // InteractionManager (see booking/detail/[bookingId].tsx, same sequencing as
      // booking/invoice.tsx), and server state is authoritative on the next read.
      return result;
    } catch {
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
