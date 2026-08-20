/**
 * Hook for managing booking detail state
 */

import { useAsyncDetail } from '@/hooks/use-async-data';
import { useCallback, useEffect, useState } from 'react';
import { bookingRepository } from '../repository/booking.repository';
import type { Booking } from '../types/booking';

export function useBookingDetail(bookingId: string) {
  const [booking, setBooking] = useState<Booking | null>(null);
  // Raw fetch result, keyed to whichever completed booking last triggered a
  // getBookingReview call -- never trusted directly (see `hasReviewed`
  // below), since switching to a non-completed/different booking must not
  // keep showing a stale previous result.
  const [reviewFetchResult, setReviewFetchResult] = useState<boolean | null>(null);

  const { loading, error, refresh } = useAsyncDetail(
    bookingId,
    (id) => bookingRepository.getBookingDetail(id),
    {
      onSuccess: (data) => setBooking(data as Booking),
    }
  );

  useEffect(() => {
    if (!booking || booking.status !== 'completed') return;

    let cancelled = false;
    bookingRepository.getBookingReview(booking.id).then((review) => {
      if (!cancelled) setReviewFetchResult(!!review);
    });

    return () => {
      cancelled = true;
    };
  }, [booking?.id, booking?.status]);

  // null = not applicable/not checked yet (non-completed booking, or still
  // loading); true/false once checked against the backend for a completed
  // booking. Re-derived from bookingRepository.getBookingReview on every
  // booking load/refresh -- never a purely local/optimistic flag -- so the
  // "sudah diulas" state survives app restarts and re-focusing this screen
  // after submitting a review from the rating screen. Computed here (not
  // reset via setState inside the effect above) so it can never show a
  // stale result for a different/non-completed booking even transiently.
  const hasReviewed = booking && booking.status === 'completed' ? reviewFetchResult : null;

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
    hasReviewed,
  };
}
