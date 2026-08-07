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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAvailableSlots = useCallback(
    async (date: string) => {
      setLoading(true);
      setError('');
      setSelectedTime('');

      try {
        const slots = await bookingRepository.getAvailableSlots(barberId, date);
        setAvailableSlots(slots);
      } catch (err) {
        setError('Gagal mengambil slot yang tersedia');
        setAvailableSlots(null);
      } finally {
        setLoading(false);
      }
    },
    [barberId],
  );

  // Automatically fetch slots for initial selectedDate (today)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (barberId && selectedDate && !availableSlots && !loading) {
      timer = setTimeout(() => {
        fetchAvailableSlots(selectedDate);
      }, 0);
    }
    return () => clearTimeout(timer);
  }, [barberId, selectedDate, availableSlots, loading, fetchAvailableSlots]);

  const handleDateSelect = useCallback(
    (date: string) => {
      setSelectedDate(date);
      fetchAvailableSlots(date);
    },
    [fetchAvailableSlots],
  );

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
