/**
 * Hook for managing booking list state
 */

import { useAsyncList } from '@/hooks/use-async-data';
import { bookingRepository } from '../repository/booking.repository';
import type { Booking } from '../types/booking';

export function useBookingList(customerId: string, type: 'active' | 'history' = 'active') {
  const { data: bookings, loading, error, refresh } = useAsyncList(
    () =>
      type === 'active'
        ? bookingRepository.getActiveBookings(customerId)
        : bookingRepository.getBookingHistory(customerId),
    [customerId, type]
  );

  return {
    bookings,
    loading,
    error,
    refresh,
  };
}
