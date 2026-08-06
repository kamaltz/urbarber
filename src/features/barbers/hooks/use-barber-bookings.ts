/**
 * useBarberBookings Hook
 * Manages barber bookings state
 */

import { useAsyncDetail } from '@/hooks/use-async-data';
import type { BookingStatus } from '../../../types/domain';
import { useState } from 'react';
import { barberRepository } from '../repository/barber.repository';
import type { BarberBooking, BarberBookingStatusSummary } from '../types/barber';

export function useBarberBookings(barberId: string, status?: string) {
  const [bookings, setBookings] = useState<BarberBooking[]>([]);
  const [summary, setSummary] = useState<BarberBookingStatusSummary | null>(null);

  const { loading, error, refresh } = useAsyncDetail(
    barberId,
    async (id) => {
      const [bookingsData, summaryData] = await Promise.all([
        barberRepository.getBarberBookings(id, status),
        barberRepository.getBookingStatusSummary(id),
      ]);
      setBookings(bookingsData);
      setSummary(summaryData);
      return bookingsData;
    },
    { skip: !barberId }
  );

  const updateBookingStatus = async (bookingId: string, newStatus: BookingStatus) => {
    if (!barberId) return { success: false };

    try {
      const result = await barberRepository.updateBookingStatus(
        barberId,
        bookingId,
        newStatus
      );

      if (result.success) {
        setBookings((prev) =>
          prev.map((b) =>
            b.bookingId === bookingId ? { ...b, status: newStatus } : b
          )
        );
      }

      return result;
    } catch {
      return { success: false, error: { message: 'Failed to update booking status' } };
    }
  };

  return {
    bookings,
    summary,
    loading,
    error,
    updateBookingStatus,
    refresh,
  };
}
