/**
 * Hook for managing booking schedule selection state
 */

import { useCallback, useEffect, useState } from 'react';
import { bookingRepository } from '../repository/booking.repository';
import { TimeSlotAvailability } from '../types/booking';

/**
 * Batch 10B-5D: the customer already picks (and must confirm) a date one
 * screen earlier on booking/options -- forwarded here as `initialDate`. Prior
 * to this fix that value was discarded and this hook always re-seeded
 * `selectedDate` to today, so a customer testing outside today's remaining
 * open hours would land on a slot list that was correctly generated but
 * entirely in the past (all slots disabled) with no indication they needed
 * to re-pick a date on this second screen.
 */
export function resolveInitialScheduleDate(initialDate: string | undefined, todayStr: string): string {
  return initialDate || todayStr;
}

export function useScheduleSelector(barberId: string, initialDate?: string) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(resolveInitialScheduleDate(initialDate, todayStr));
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlotAvailability | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(barberId));
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    if (barberId && selectedDate) {
      bookingRepository
        .getAvailableSlots(barberId, selectedDate)
        .then((slots) => {
          if (isMounted) {
            setAvailableSlots(slots);
            setError('');
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
  }, [barberId, selectedDate]);

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
