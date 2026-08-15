/**
 * Date-aware slot eligibility tests.
 *
 * Regression coverage for the bug where slot eligibility compared a slot's HH:mm
 * against the current HH:mm independently of the selected booking date, so a slot at
 * 09:00 was reported "already elapsed" on EVERY date once 09:00 had passed today.
 *
 * Every case below runs against a fixed instant, expressed in UTC but asserted in
 * Asia/Jakarta (UTC+7), so results never depend on the machine's local zone:
 *   2026-08-16T07:20:00Z === 2026-08-16 14:20 WIB
 */

import { describe, expect, it } from 'vitest';
import {
  BOOKING_TIME_ZONE,
  evaluateSlotEligibility,
  getZonedToday,
  isPastDate,
  isSlotBookable,
  MIN_BOOKING_LEAD_TIME_MINUTES,
  toSlotEpochMs,
} from '../slot-datetime';

/** 16 Aug 2026, 14:20 WIB. Minimum bookable start with a 60-minute lead time: 15:20. */
const NOW = new Date('2026-08-16T07:20:00Z');
/** 16 Aug 2026, 23:30 WIB. Minimum bookable start: 17 Aug 00:30 WIB. */
const NOW_LATE_NIGHT = new Date('2026-08-16T16:30:00Z');

const bookable = (date: string, startTime: string, now: Date = NOW) =>
  isSlotBookable({ date, startTime, now });

describe('slot-datetime: canonical timezone handling', () => {
  it('MIN_BOOKING_LEAD_TIME_MINUTES is the documented 60 minutes', () => {
    expect(MIN_BOOKING_LEAD_TIME_MINUTES).toBe(60);
  });

  it('resolves "today" in Asia/Jakarta, not UTC', () => {
    // 2026-08-16T17:00:00Z is already 17 Aug 00:00 in WIB. The old
    // `new Date().toISOString().split('T')[0]` would answer 2026-08-16 here.
    expect(getZonedToday(new Date('2026-08-16T17:00:00Z'))).toBe('2026-08-17');
    expect(getZonedToday(NOW)).toBe('2026-08-16');
    expect(BOOKING_TIME_ZONE).toBe('Asia/Jakarta');
  });

  it('converts date + time to an absolute instant in the canonical zone', () => {
    expect(toSlotEpochMs('2026-08-16', '14:20')).toBe(NOW.getTime());
    expect(toSlotEpochMs('2026-08-17', '00:00')).toBe(new Date('2026-08-16T17:00:00Z').getTime());
  });

  it('rejects malformed and non-existent civil dates instead of rolling them over', () => {
    expect(toSlotEpochMs('2026-02-31', '09:00')).toBeNull();
    expect(toSlotEpochMs('16-08-2026', '09:00')).toBeNull();
    expect(toSlotEpochMs('2026-08-16', '25:00')).toBeNull();
    expect(toSlotEpochMs('2026-08-16', '')).toBeNull();
    expect(evaluateSlotEligibility({ date: '2026-02-31', startTime: '09:00', now: NOW })).toEqual({
      bookable: false,
      code: 'INVALID_SLOT',
      reason: 'Tanggal atau waktu tidak valid',
    });
  });
});

describe('slot-datetime: past date (15 Aug, now 16 Aug 14:20)', () => {
  it('marks a past date as past regardless of time of day', () => {
    expect(isPastDate('2026-08-15', NOW)).toBe(true);
    expect(isPastDate('2026-08-16', NOW)).toBe(false);
    expect(isPastDate('2026-08-17', NOW)).toBe(false);
  });

  it('rejects every slot on a past date', () => {
    expect(bookable('2026-08-15', '09:00')).toBe(false);
    // 15:30 is bookable *today* but must still be rejected on yesterday's date --
    // the previous implementation returned past dates unfiltered, so this reported
    // as available.
    expect(bookable('2026-08-15', '15:30')).toBe(false);
    expect(bookable('2026-08-15', '23:30')).toBe(false);

    expect(evaluateSlotEligibility({ date: '2026-08-15', startTime: '15:30', now: NOW })).toEqual({
      bookable: false,
      code: 'SLOT_IN_PAST',
      reason: 'Waktu telah berlalu',
    });
  });
});

describe('slot-datetime: today (16 Aug, now 14:20, lead time 60m)', () => {
  it.each([
    ['08:00', false],
    ['09:00', false],
    ['14:00', false],
    ['14:30', false],
    ['15:00', false],
    ['15:19', false],
    ['15:20', true], // boundary, inclusive
    ['15:30', true],
    ['16:00', true],
  ])('16 Aug %s -> bookable=%s', (time, expected) => {
    expect(bookable('2026-08-16', time)).toBe(expected);
  });

  it('distinguishes an elapsed slot from one inside the lead-time window', () => {
    expect(evaluateSlotEligibility({ date: '2026-08-16', startTime: '14:00', now: NOW })).toEqual({
      bookable: false,
      code: 'SLOT_IN_PAST',
      reason: 'Waktu telah berlalu',
    });
    expect(evaluateSlotEligibility({ date: '2026-08-16', startTime: '15:00', now: NOW })).toEqual({
      bookable: false,
      code: 'SLOT_BELOW_LEAD_TIME',
      reason: 'Pemesanan minimal 60 menit sebelumnya',
    });
  });

  it('treats the current minute itself as elapsed', () => {
    expect(evaluateSlotEligibility({ date: '2026-08-16', startTime: '14:20', now: NOW })).toMatchObject({
      code: 'SLOT_IN_PAST',
    });
  });

  it('with a 30-minute slot interval, 15:30 is the first bookable slot of the day', () => {
    const grid = ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'];
    const firstBookable = grid.find((time) => bookable('2026-08-16', time));
    expect(firstBookable).toBe('15:30');
  });
});

describe('slot-datetime: tomorrow (17 Aug, now 16 Aug 14:20) -- the reported bug', () => {
  it.each(['08:00', '09:00', '10:00', '13:00', '14:00', '15:00'])(
    '17 Aug %s stays bookable even though that time already elapsed today',
    (time) => {
      expect(bookable('2026-08-17', time)).toBe(true);
    }
  );

  it('does not apply the current clock time to a future date', () => {
    // Before the fix these three were disabled purely because 09:00/10:00/13:00 are
    // earlier than 14:20 on the wall clock.
    expect(bookable('2026-08-16', '09:00')).toBe(false); // today: correctly disabled
    expect(bookable('2026-08-17', '09:00')).toBe(true); // tomorrow: must be enabled
    expect(bookable('2026-08-18', '09:00')).toBe(true);
  });
});

describe('slot-datetime: further future dates (20 Aug, now 16 Aug 14:20)', () => {
  it.each(['08:00', '09:00', '13:00'])('20 Aug %s is bookable', (time) => {
    expect(bookable('2026-08-20', time)).toBe(true);
  });

  it('remains bookable across month and year boundaries', () => {
    expect(bookable('2026-09-01', '08:00')).toBe(true);
    expect(bookable('2027-01-01', '08:00')).toBe(true);
  });
});

describe('slot-datetime: cross-midnight lead time (now 16 Aug 23:30)', () => {
  // Proves the rule is a real datetime comparison rather than "future date = always
  // valid": tomorrow's earliest slots are still inside tonight's 60-minute window.
  it.each([
    ['00:00', false],
    ['00:15', false],
    ['00:29', false],
    ['00:30', true], // boundary, inclusive
    ['01:00', true],
  ])('17 Aug %s -> bookable=%s', (time, expected) => {
    expect(bookable('2026-08-17', time, NOW_LATE_NIGHT)).toBe(expected);
  });

  it('reports the lead-time reason (not "already elapsed") for tomorrow 00:00', () => {
    expect(
      evaluateSlotEligibility({ date: '2026-08-17', startTime: '00:00', now: NOW_LATE_NIGHT })
    ).toEqual({
      bookable: false,
      code: 'SLOT_BELOW_LEAD_TIME',
      reason: 'Pemesanan minimal 60 menit sebelumnya',
    });
  });

  it('still treats today (16 Aug) as today at 23:30 WIB, not as tomorrow', () => {
    expect(getZonedToday(NOW_LATE_NIGHT)).toBe('2026-08-16');
    expect(isPastDate('2026-08-16', NOW_LATE_NIGHT)).toBe(false);
  });
});

describe('slot-datetime: stale screen', () => {
  it('a slot valid at 14:00 becomes invalid once the clock passes the lead-time boundary', () => {
    const at1400 = new Date('2026-08-16T07:00:00Z'); // 14:00 WIB
    const at1431 = new Date('2026-08-16T07:31:00Z'); // 14:31 WIB

    expect(bookable('2026-08-16', '15:00', at1400)).toBe(true);
    expect(bookable('2026-08-16', '15:00', at1431)).toBe(false);

    // ...while tomorrow's morning slots are untouched by the same clock movement.
    expect(bookable('2026-08-17', '09:00', at1400)).toBe(true);
    expect(bookable('2026-08-17', '09:00', at1431)).toBe(true);
  });
});
