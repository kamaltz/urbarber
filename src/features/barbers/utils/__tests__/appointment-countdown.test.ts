import { describe, expect, it } from 'vitest';
import { getAppointmentCountdown } from '../appointment-countdown';

describe('getAppointmentCountdown', () => {
  it('1. null when scheduledAt/scheduledTime are missing', () => {
    expect(getAppointmentCountdown(undefined, '10:00')).toBeNull();
    expect(getAppointmentCountdown('2026-08-19', undefined)).toBeNull();
  });

  it('2. null for an unparseable time string', () => {
    expect(getAppointmentCountdown('2026-08-19', 'not-a-time')).toBeNull();
  });

  it('3. null for an out-of-range time (e.g. 25:99)', () => {
    expect(getAppointmentCountdown('2026-08-19', '25:99')).toBeNull();
  });

  it('4. counts down when the appointment is in the future', () => {
    const now = new Date('2026-08-19T09:48:00').getTime();
    const result = getAppointmentCountdown('2026-08-19', '10:00', now);
    expect(result).toEqual({ minutesUntil: 12, isLate: false, label: 'Mulai dalam 12 menit' });
  });

  it('5. reports "late" instead of a negative number once the time has passed', () => {
    const now = new Date('2026-08-19T10:05:00').getTime();
    const result = getAppointmentCountdown('2026-08-19', '10:00', now);
    expect(result).toEqual({ minutesUntil: -5, isLate: true, label: 'Terlambat 5 menit' });
  });

  it('6. never shows a negative-looking label at exactly the scheduled minute', () => {
    const now = new Date('2026-08-19T10:00:00').getTime();
    const result = getAppointmentCountdown('2026-08-19', '10:00', now);
    expect(result?.isLate).toBe(false);
    expect(result?.label).not.toMatch(/-/);
  });

  it('7. accepts a full ISO datetime for scheduledAt, using only its date part', () => {
    const now = new Date('2026-08-19T09:55:00').getTime();
    const result = getAppointmentCountdown('2026-08-19T00:00:00.000Z', '10:00', now);
    expect(result?.minutesUntil).toBe(5);
  });
});
