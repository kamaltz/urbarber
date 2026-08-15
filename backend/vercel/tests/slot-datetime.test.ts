/**
 * Backend date-aware slot eligibility tests.
 *
 * Pure unit tests (no Firestore emulator needed): they exercise the exact module the
 * availability endpoint and POST /api/payments/create both call, so the trusted server
 * rule is pinned independently of the client.
 *
 * Regression coverage for the bug where eligibility compared a slot's HH:mm against
 * the current HH:mm behind a `date === today` guard, which meant a past date reported
 * every slot as available and a future date skipped the lead-time rule entirely.
 *
 * Fixed instants are expressed in UTC and asserted in Asia/Jakarta (UTC+7):
 *   2026-08-16T07:20:00Z === 2026-08-16 14:20 WIB
 */
import { describe, expect, it } from 'vitest';
import {
  evaluateSlotEligibility,
  getZonedToday,
  isPastDate,
  isSlotBookable,
  MIN_BOOKING_LEAD_TIME_MINUTES,
  toSlotEpochMs,
} from '../src/bookings/slot-datetime.js';
import { filterPastSlots, generateTimeSlots } from '../src/bookings/slot-generator.js';

/** 16 Aug 2026, 14:20 WIB. Earliest bookable start with a 60-minute lead time: 15:20. */
const NOW = new Date('2026-08-16T07:20:00Z');
/** 16 Aug 2026, 23:30 WIB. Earliest bookable start: 17 Aug 00:30 WIB. */
const NOW_LATE_NIGHT = new Date('2026-08-16T16:30:00Z');

const bookable = (date: string, startTime: string, now: Date = NOW) =>
  isSlotBookable({ date, startTime, now });

describe('backend slot-datetime: canonical timezone', () => {
  it('uses the documented 60-minute lead time', () => {
    expect(MIN_BOOKING_LEAD_TIME_MINUTES).toBe(60);
  });

  it('resolves "today" in Asia/Jakarta even though server time is UTC', () => {
    expect(getZonedToday(NOW)).toBe('2026-08-16');
    expect(getZonedToday(NOW_LATE_NIGHT)).toBe('2026-08-16');
    // Already past midnight in WIB while UTC still reads 16 Aug.
    expect(getZonedToday(new Date('2026-08-16T17:00:00Z'))).toBe('2026-08-17');
  });

  it('converts a requested slot to an absolute instant comparable with server time', () => {
    expect(toSlotEpochMs('2026-08-16', '14:20')).toBe(NOW.getTime());
    expect(toSlotEpochMs('2026-08-17', '00:30')).toBe(new Date('2026-08-16T17:30:00Z').getTime());
  });

  it('rejects malformed / non-existent slot datetimes', () => {
    expect(toSlotEpochMs('2026-02-31', '09:00')).toBeNull();
    expect(toSlotEpochMs('2026-8-16', '09:00')).toBeNull();
    expect(evaluateSlotEligibility({ date: '2026-08-16', startTime: 'abc', now: NOW })).toMatchObject({
      bookable: false,
      code: 'INVALID_SLOT',
    });
  });
});

describe('backend slot-datetime: past date', () => {
  it('flags dates before today in the canonical zone', () => {
    expect(isPastDate('2026-08-15', NOW)).toBe(true);
    expect(isPastDate('2026-08-16', NOW)).toBe(false);
  });

  it('rejects every requested slot on a past date', () => {
    expect(bookable('2026-08-15', '09:00')).toBe(false);
    expect(bookable('2026-08-15', '15:30')).toBe(false);
    expect(evaluateSlotEligibility({ date: '2026-08-15', startTime: '15:30', now: NOW })).toMatchObject({
      code: 'SLOT_IN_PAST',
    });
  });
});

describe('backend slot-datetime: today (now 14:20 WIB)', () => {
  it.each([
    ['08:00', false],
    ['09:00', false],
    ['14:00', false],
    ['14:30', false],
    ['15:00', false],
    ['15:19', false],
    ['15:20', true],
    ['15:30', true],
    ['16:00', true],
  ])('16 Aug %s -> bookable=%s', (time, expected) => {
    expect(bookable('2026-08-16', time)).toBe(expected);
  });

  it('separates elapsed slots from lead-time rejections', () => {
    expect(evaluateSlotEligibility({ date: '2026-08-16', startTime: '14:00', now: NOW })).toMatchObject({
      code: 'SLOT_IN_PAST',
    });
    expect(evaluateSlotEligibility({ date: '2026-08-16', startTime: '15:00', now: NOW })).toMatchObject({
      code: 'SLOT_BELOW_LEAD_TIME',
    });
  });
});

describe('backend slot-datetime: future dates are accepted', () => {
  it.each(['08:00', '09:00', '10:00', '13:00', '14:00', '15:00'])(
    'accepts 17 Aug %s requested at 16 Aug 14:20',
    (time) => {
      expect(bookable('2026-08-17', time)).toBe(true);
    }
  );

  it.each(['08:00', '09:00', '13:00'])('accepts 20 Aug %s', (time) => {
    expect(bookable('2026-08-20', time)).toBe(true);
  });

  it('never compares a future slot against the current clock time alone', () => {
    expect(bookable('2026-08-16', '09:00')).toBe(false);
    expect(bookable('2026-08-17', '09:00')).toBe(true);
  });
});

describe('backend slot-datetime: cross-midnight lead time (now 23:30 WIB)', () => {
  it.each([
    ['00:00', false],
    ['00:15', false],
    ['00:29', false],
    ['00:30', true],
    ['01:00', true],
  ])('17 Aug %s -> bookable=%s', (time, expected) => {
    expect(bookable('2026-08-17', time, NOW_LATE_NIGHT)).toBe(expected);
  });

  it('rejects tomorrow 00:00 for lead time, not as "already elapsed"', () => {
    expect(
      evaluateSlotEligibility({ date: '2026-08-17', startTime: '00:00', now: NOW_LATE_NIGHT })
    ).toMatchObject({ code: 'SLOT_BELOW_LEAD_TIME' });
  });
});

describe('backend generateTimeSlots: date-aware availability', () => {
  const generateForDate = (date: string, now: Date = NOW) =>
    generateTimeSlots({
      date,
      workingHours: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
      serviceDurationMinutes: 30,
      slotIntervalMinutes: 30,
      now,
    });

  it('past date: no slot is offered as available', () => {
    const slots = generateForDate('2026-08-15');
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.some((s) => s.available)).toBe(false);
  });

  it('today: first available slot is 15:30 on a 30-minute grid', () => {
    expect(generateForDate('2026-08-16').find((s) => s.available)?.time).toBe('15:30');
  });

  it('tomorrow: every slot the schedule offers is available', () => {
    const slots = generateForDate('2026-08-17');
    expect(slots.every((s) => s.available)).toBe(true);
    expect(slots.find((s) => s.time === '09:00')?.available).toBe(true);
  });

  it('cross-midnight: tomorrow 00:00 blocked, 00:30 open when now is 23:30', () => {
    const slots = generateTimeSlots({
      date: '2026-08-17',
      workingHours: { isOpen: true, openTime: '00:00', closeTime: '06:00' },
      serviceDurationMinutes: 30,
      slotIntervalMinutes: 30,
      now: NOW_LATE_NIGHT,
    });

    expect(slots.find((s) => s.time === '00:00')?.available).toBe(false);
    expect(slots.find((s) => s.time === '00:30')?.available).toBe(true);
  });

  it('active slot locks still block future-date slots (temporary hold parity)', () => {
    const slots = generateTimeSlots({
      date: '2026-08-17',
      workingHours: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
      serviceDurationMinutes: 30,
      slotIntervalMinutes: 30,
      slotLocks: [
        { startTime: '09:00', durationMinutes: 30, expiresAt: NOW.getTime() + 10 * 60 * 1000 },
      ],
      now: NOW,
    });

    expect(slots.find((s) => s.time === '09:00')?.available).toBe(false);
    expect(slots.find((s) => s.time === '09:30')?.available).toBe(true);
  });

  it('filterPastSlots preserves an existing unavailable reason', () => {
    const filtered = filterPastSlots(
      [{ id: 'a', time: '09:00', endTime: '09:30', available: false, reason: 'Sudah dibooking' }],
      '2026-08-17',
      'Asia/Jakarta',
      NOW
    );
    expect(filtered[0].reason).toBe('Sudah dibooking');
  });
});

describe('POST /api/payments/create slot-time guard', () => {
  // The handler (backend/vercel/api/payments.ts) calls evaluateSlotEligibility with
  // the request's {date, startTime} BEFORE acquireSlotLock, and maps a non-bookable
  // result straight to `400 { error: { code, message } }`. Because that check
  // precedes lock acquisition, the temporary hold and the booking document are
  // governed by exactly the same rule as the slot grid -- an ineligible request never
  // reaches the hold at all.
  const requestOutcome = (date: string, startTime: string, now: Date = NOW) => {
    const result = evaluateSlotEligibility({ date, startTime, now });
    return result.bookable ? { status: 200 } : { status: 400, code: result.code, message: result.reason };
  };

  it('rejects a booking request for a past date', () => {
    expect(requestOutcome('2026-08-15', '09:00')).toEqual({
      status: 400,
      code: 'SLOT_IN_PAST',
      message: 'Waktu telah berlalu',
    });
  });

  it('rejects a booking request for an elapsed slot today', () => {
    expect(requestOutcome('2026-08-16', '09:00').code).toBe('SLOT_IN_PAST');
  });

  it('rejects a booking request inside the 60-minute lead-time window', () => {
    expect(requestOutcome('2026-08-16', '15:00')).toEqual({
      status: 400,
      code: 'SLOT_BELOW_LEAD_TIME',
      message: 'Pemesanan minimal 60 menit sebelumnya',
    });
  });

  it('accepts today’s first eligible slot and everything after it', () => {
    expect(requestOutcome('2026-08-16', '15:20').status).toBe(200);
    expect(requestOutcome('2026-08-16', '16:00').status).toBe(200);
  });

  it('accepts a future-date morning slot the client would previously have hidden', () => {
    // The acceptance criterion the fix exists for: requested at 14:20 today,
    // tomorrow 09:00 must be accepted by the server, not rejected.
    expect(requestOutcome('2026-08-17', '09:00').status).toBe(200);
    expect(requestOutcome('2026-08-20', '08:00').status).toBe(200);
  });

  it('still enforces the lead time across midnight for a future date', () => {
    expect(requestOutcome('2026-08-17', '00:00', NOW_LATE_NIGHT).code).toBe('SLOT_BELOW_LEAD_TIME');
    expect(requestOutcome('2026-08-17', '00:30', NOW_LATE_NIGHT).status).toBe(200);
  });

  it('rejects a malformed slot datetime rather than accepting it', () => {
    expect(requestOutcome('2026-02-31', '09:00').code).toBe('INVALID_SLOT');
  });
});

describe('backend/frontend parity contract', () => {
  // The client hides ineligible slots and the server rejects them; both call the same
  // rule, so these expectations must hold identically in
  // src/features/bookings/utils/__tests__/slot-datetime.test.ts.
  const cases: [string, string, Date, boolean][] = [
    ['2026-08-15', '09:00', NOW, false],
    ['2026-08-16', '09:00', NOW, false],
    ['2026-08-16', '15:19', NOW, false],
    ['2026-08-16', '15:20', NOW, true],
    ['2026-08-17', '09:00', NOW, true],
    ['2026-08-20', '08:00', NOW, true],
    ['2026-08-17', '00:00', NOW_LATE_NIGHT, false],
    ['2026-08-17', '00:30', NOW_LATE_NIGHT, true],
  ];

  it.each(cases)('%s %s -> bookable=%s', (date, time, now, expected) => {
    expect(bookable(date, time, now)).toBe(expected);
  });
});
