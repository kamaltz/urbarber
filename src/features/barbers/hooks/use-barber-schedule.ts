/**
 * useBarberSchedule Hook
 * Manages barber weekly schedule state
 */

import { useEffect, useState } from 'react';
import { barberRepository } from '../repository/barber.repository';
import type { BarberWeeklySchedule, UpdateBarberScheduleRequest } from '../types/barber';

export function useBarberSchedule(barberId: string) {
  const [schedule, setSchedule] = useState<BarberWeeklySchedule | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(barberId));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!barberId) {
      return;
    }

    let isMounted = true;
    const loadSchedule = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await barberRepository.getWeeklySchedule(barberId);
        if (isMounted) {
          setSchedule(data);
          if (!data) {
            setError('Schedule not found');
          }
        }
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to load schedule');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSchedule();
    return () => {
      isMounted = false;
    };
  }, [barberId]);

  const updateSchedule = async (data: UpdateBarberScheduleRequest) => {
    if (!barberId) return { success: false };

    try {
      setSaving(true);
      const result = await barberRepository.updateWeeklySchedule(barberId, data);

      if (result.success) {
        setSchedule((prev) =>
          prev
            ? {
                ...prev,
                schedule: data.schedule,
                lastUpdated: new Date().toISOString(),
              }
            : null
        );
      }

      return result;
    } catch {
      return { success: false, error: { message: 'Save failed' } };
    } finally {
      setSaving(false);
    }
  };

  const refresh = async () => {
    if (!barberId) return;

    try {
      setLoading(true);
      const data = await barberRepository.getWeeklySchedule(barberId);
      setSchedule(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setLoading(false);
    }
  };

  return {
    schedule,
    loading,
    error,
    saving,
    updateSchedule,
    refresh,
  };
}
