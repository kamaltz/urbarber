/**
 * Barber Schedule Constants & Canonical Defaults
 * Provides default working hours for barbers (Senin-Sabtu 09:00 - 21:00, Minggu 10:00 - 18:00)
 * that can be dynamically customized by each barber.
 */

import type { BarberScheduleDay, BarberWeeklySchedule } from '../types/barber';

export const DAYS_OF_WEEK: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday')[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const DAY_LABELS_ID: Record<string, string> = {
  Monday: 'Senin',
  Tuesday: 'Selasa',
  Wednesday: 'Rabu',
  Thursday: 'Kamis',
  Friday: 'Jumat',
  Saturday: 'Sabtu',
  Sunday: 'Minggu',
};

/**
 * Standard default working hours schedule for barbers:
 * - Monday to Saturday: 09:00 - 21:00
 * - Sunday: 10:00 - 18:00
 */
export const DEFAULT_BARBER_SCHEDULE_DAYS: BarberScheduleDay[] = [
  { dayOfWeek: 'Monday', isOpen: true, startTime: '09:00', endTime: '21:00', openTime: '09:00', closeTime: '21:00' },
  { dayOfWeek: 'Tuesday', isOpen: true, startTime: '09:00', endTime: '21:00', openTime: '09:00', closeTime: '21:00' },
  { dayOfWeek: 'Wednesday', isOpen: true, startTime: '09:00', endTime: '21:00', openTime: '09:00', closeTime: '21:00' },
  { dayOfWeek: 'Thursday', isOpen: true, startTime: '09:00', endTime: '21:00', openTime: '09:00', closeTime: '21:00' },
  { dayOfWeek: 'Friday', isOpen: true, startTime: '09:00', endTime: '21:00', openTime: '09:00', closeTime: '21:00' },
  { dayOfWeek: 'Saturday', isOpen: true, startTime: '09:00', endTime: '21:00', openTime: '09:00', closeTime: '21:00' },
  { dayOfWeek: 'Sunday', isOpen: true, startTime: '10:00', endTime: '18:00', openTime: '10:00', closeTime: '18:00' },
];

/**
 * Helper to generate default BarberWeeklySchedule for a given barberId
 */
export function getDefaultWeeklySchedule(barberId: string): BarberWeeklySchedule {
  return {
    barberId,
    schedule: DEFAULT_BARBER_SCHEDULE_DAYS,
    isConfigured: true,
    isConfirmed: true,
    scheduleSource: 'confirmed_default',
    unavailableDates: [],
    unavailableDateRanges: [],
    lastUpdated: new Date().toISOString(),
  };
}
