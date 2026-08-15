/**
 * Hook for managing booking schedule selection state
 */

import { useCallback, useEffect, useState } from 'react';
import { bookingRepository } from '../repository/booking.repository';
import { TimeSlotAvailability } from '../types/booking';
import { getZonedToday } from '../utils/slot-datetime';

/**
 * How often an open schedule screen re-asks the server for availability.
 *
 * Availability is time-sensitive in two directions: today's slots fall inside the
 * 60-minute lead-time window as the clock advances, and any date's slots can be taken
 * by another customer while this screen sits idle. Without this, a customer who opened
 * the screen at 14:00 and tapped "Proses Pesanan" at 14:31 could still select a 15:00
 * slot the server would (correctly) reject at payment time. The server rule is
 * date-aware, so a refresh never disables a future date's slots merely because the
 * wall clock moved -- 09:00 tomorrow stays available all afternoon.
 */
const AVAILABILITY_REFRESH_INTERVAL_MS = 60_000;

/**
 * Batch 10B-5D: the customer already picks (and must confirm) a date one
 * screen earlier on booking/options -- forwarded here as `initialDate`. Prior
 * to this fix that value was discarded and this hook always re-seeded
 * `selectedDate` to today, so a customer testing outside today's remaining
 * open hours would land on a slot list that was correctly generated but
 * entirely in the past (all slots disabled) with no indication they needed
 * to re-pick a date on this second screen.
 *
 * A forwarded date that is already in the past (screen resumed the next day, stale
 * deep link) falls back to today rather than opening on an unbookable date -- past
 * dates are never selectable. `todayStr` must be the canonical Asia/Jakarta date, so
 * both sides of this comparison are in the same zone.
 */
export function resolveInitialScheduleDate(initialDate: string | undefined, todayStr: string): string {
  if (!initialDate) return todayStr;
  return initialDate < todayStr ? todayStr : initialDate;
}

export function useScheduleSelector(barberId: string, initialDate?: string) {
  // Canonical WIB date. `new Date().toISOString().split('T')[0]` returns the UTC date,
  // which is seven hours behind Jakarta -- between 00:00 and 07:00 WIB it seeds this
  // screen with *yesterday*, a date the server correctly reports as fully unbookable.
  const todayStr = getZonedToday();
  const [selectedDate, setSelectedDate] = useState<string>(resolveInitialScheduleDate(initialDate, todayStr));
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlotAvailability | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(barberId));
  const [error, setError] = useState<string>('');
  const [refreshTick, setRefreshTick] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    if (barberId && selectedDate) {
      bookingRepository
        .getAvailableSlots(barberId, selectedDate)
        .then((slots) => {
          if (isMounted) {
            setAvailableSlots(slots);
            setError('');
            // Drop a previously chosen time that the refreshed (authoritative)
            // availability no longer offers, so the Continue button can't forward a
            // slot the payment endpoint will reject.
            setSelectedTime((current) =>
              current && !slots.slots.some((s) => s.time === current && s.available) ? '' : current
            );
          }
        })
        .catch(() => {
          if (isMounted) {
            setError('Gagal mengambil slot yang tersedia');
            setAvailableSlots(null);
          }
        })
        .finally(() => {
          if (isMounted) {
            setLoading(false);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [barberId, selectedDate, refreshTick]);

  useEffect(() => {
    if (!barberId) return;
    const interval = setInterval(() => {
      setRefreshTick((tick) => tick + 1);
    }, AVAILABILITY_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [barberId]);

  const handleDateSelect = useCallback((date: string) => {
    setSelectedDate(date);
    setSelectedTime('');
  }, []);

  const handleTimeSelect = useCallback((time: string) => {
    setSelectedTime(time);
  }, []);

  return {
    selectedDate,
    selectedTime,
    availableSlots,
    loading,
    error,
    onDateSelect: handleDateSelect,
    onTimeSelect: handleTimeSelect,
  };
}
