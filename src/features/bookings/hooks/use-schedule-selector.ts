/**
 * Hook for managing booking schedule selection state
 */

import { useCallback, useState } from 'react';
import { bookingRepository } from '../repository/booking.repository';
import { TimeSlotAvailability } from '../types/booking';

export function useScheduleSelector(barberId: string) {
  const [selectedDate, setSelectedDate] = useState<string>('');
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
