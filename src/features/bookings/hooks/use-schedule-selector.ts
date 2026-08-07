/**
 * Hook for managing booking schedule selection state
 */

import { useCallback, useEffect, useState } from 'react';
import { bookingRepository } from '../repository/booking.repository';
import { TimeSlotAvailability } from '../types/booking';

export function useScheduleSelector(barberId: string) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
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
