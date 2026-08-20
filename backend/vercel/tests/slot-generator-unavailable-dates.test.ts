/**
 * Barber holiday date-range tests (thesis v1.1 stabilization, §17).
 *
 * Previously the barber schedule only ever supported single unavailable
 * dates (unavailableDates: string[]). This adds an inclusive date-range
 * model (unavailableDateRanges: {start,end}[]) alongside it -- both are
 * consulted together (applyUnavailableDates), and existing single-date data
 * keeps working unchanged. Ranges are compared as plain 'YYYY-MM-DD'
 * strings, which already sort correctly across month/year boundaries for
 * zero-padded ISO dates, so month/year-crossing ranges need no special
 * casing and no Date-object timezone handling.
 */
import { describe, expect, it } from 'vitest';
import {
  applyUnavailableDates,
  generateTimeSlots,
  isDateInUnavailableRanges,
  type UnavailableDateRange,
  type WorkingHours,
} from '../src/bookings/slot-generator.js';

const OPEN_ALL_DAY: WorkingHours = { isOpen: true, openTime: '09:00', closeTime: '21:00' };

describe('isDateInUnavailableRanges', () => {
  it('same-day range: the single day is unavailable, the days immediately before/after are not', () => {
    const ranges: UnavailableDateRange[] = [{ start: '2026-09-10', end: '2026-09-10' }];
    expect(isDateInUnavailableRanges('2026-09-10', ranges)).toBe(true);
    expect(isDateInUnavailableRanges('2026-09-09', ranges)).toBe(false);
    expect(isDateInUnavailableRanges('2026-09-11', ranges)).toBe(false);
  });

  it('multi-day range within a single month: every day inside is unavailable, boundary days included (inclusive)', () => {
    const ranges: UnavailableDateRange[] = [{ start: '2026-09-10', end: '2026-09-14' }];
    for (const d of ['2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13', '2026-09-14']) {
      expect(isDateInUnavailableRanges(d, ranges)).toBe(true);
    }
    expect(isDateInUnavailableRanges('2026-09-09', ranges)).toBe(false);
    expect(isDateInUnavailableRanges('2026-09-15', ranges)).toBe(false);
  });

  it('December -> January range: crosses both month and year correctly', () => {
    const ranges: UnavailableDateRange[] = [{ start: '2026-12-20', end: '2027-01-03' }];
    expect(isDateInUnavailableRanges('2026-12-19', ranges)).toBe(false);
    expect(isDateInUnavailableRanges('2026-12-20', ranges)).toBe(true);
    expect(isDateInUnavailableRanges('2026-12-25', ranges)).toBe(true);
    expect(isDateInUnavailableRanges('2026-12-31', ranges)).toBe(true);
    expect(isDateInUnavailableRanges('2027-01-01', ranges)).toBe(true);
    expect(isDateInUnavailableRanges('2027-01-03', ranges)).toBe(true);
    expect(isDateInUnavailableRanges('2027-01-04', ranges)).toBe(false);
  });

  it('leap year crossing: Feb 28 -> Mar 1 range correctly includes Feb 29 in a leap year (2028)', () => {
    const ranges: UnavailableDateRange[] = [{ start: '2028-02-28', end: '2028-03-01' }];
    expect(isDateInUnavailableRanges('2028-02-27', ranges)).toBe(false);
    expect(isDateInUnavailableRanges('2028-02-28', ranges)).toBe(true);
    expect(isDateInUnavailableRanges('2028-02-29', ranges)).toBe(true); // leap day
    expect(isDateInUnavailableRanges('2028-03-01', ranges)).toBe(true);
    expect(isDateInUnavailableRanges('2028-03-02', ranges)).toBe(false);
  });

  it('non-leap year: Feb has no 29th, so a Feb 28 -> Mar 1 range still resolves correctly day-by-day', () => {
    const ranges: UnavailableDateRange[] = [{ start: '2027-02-28', end: '2027-03-01' }];
    expect(isDateInUnavailableRanges('2027-02-28', ranges)).toBe(true);
    expect(isDateInUnavailableRanges('2027-03-01', ranges)).toBe(true);
    expect(isDateInUnavailableRanges('2027-03-02', ranges)).toBe(false);
  });

  it('overlapping ranges are handled safely -- a date matching more than one range is still just unavailable, no crash/duplication issue', () => {
    const ranges: UnavailableDateRange[] = [
      { start: '2026-12-24', end: '2026-12-26' },
      { start: '2026-12-25', end: '2027-01-01' },
    ];
    expect(isDateInUnavailableRanges('2026-12-25', ranges)).toBe(true);
    expect(isDateInUnavailableRanges('2026-12-31', ranges)).toBe(true);
    expect(isDateInUnavailableRanges('2026-12-23', ranges)).toBe(false);
    expect(isDateInUnavailableRanges('2027-01-02', ranges)).toBe(false);
  });

  it('a malformed range (missing start/end) never matches, rather than throwing', () => {
    const ranges = [{ start: '2026-12-24' }, {}, { end: '2026-12-26' }] as UnavailableDateRange[];
    expect(() => isDateInUnavailableRanges('2026-12-24', ranges)).not.toThrow();
    expect(isDateInUnavailableRanges('2026-12-24', ranges)).toBe(false);
  });

  it('no ranges (undefined/empty) never matches', () => {
    expect(isDateInUnavailableRanges('2026-12-24')).toBe(false);
    expect(isDateInUnavailableRanges('2026-12-24', [])).toBe(false);
  });
});

describe('applyUnavailableDates -- single dates + ranges together (backward compatibility)', () => {
  it('a single unavailableDates entry still blocks its exact date with no ranges configured', () => {
    expect(applyUnavailableDates('2026-09-10', ['2026-09-10'], [])).toBe(true);
    expect(applyUnavailableDates('2026-09-11', ['2026-09-10'], [])).toBe(false);
  });

  it('a date inside a range is blocked even when unavailableDates is empty', () => {
    expect(applyUnavailableDates('2026-12-25', [], [{ start: '2026-12-20', end: '2027-01-03' }])).toBe(true);
  });

  it('a date matching neither single dates nor any range is available', () => {
    expect(
      applyUnavailableDates('2026-06-01', ['2026-09-10'], [{ start: '2026-12-20', end: '2027-01-03' }])
    ).toBe(false);
  });

  it('a date can be blocked by a single date and unaffected by an unrelated range simultaneously', () => {
    expect(applyUnavailableDates('2026-09-10', ['2026-09-10'], [{ start: '2026-12-20', end: '2027-01-03' }])).toBe(
      true
    );
  });
});

describe('generateTimeSlots -- honors unavailableDateRanges end to end', () => {
  it('returns zero slots for a date inside a Dec -> Jan holiday range', () => {
    const slots = generateTimeSlots({
      date: '2026-12-25',
      workingHours: OPEN_ALL_DAY,
      serviceDurationMinutes: 30,
      unavailableDateRanges: [{ start: '2026-12-20', end: '2027-01-03' }],
    });
    expect(slots).toEqual([]);
  });

  it('generates normal slots for a date just outside the holiday range', () => {
    const slots = generateTimeSlots({
      date: '2027-01-04',
      workingHours: OPEN_ALL_DAY,
      serviceDurationMinutes: 30,
      unavailableDateRanges: [{ start: '2026-12-20', end: '2027-01-03' }],
    });
    expect(slots.length).toBeGreaterThan(0);
  });

  it('returns zero slots for the leap day when it falls inside a configured range', () => {
    const slots = generateTimeSlots({
      date: '2028-02-29',
      workingHours: OPEN_ALL_DAY,
      serviceDurationMinutes: 30,
      unavailableDateRanges: [{ start: '2028-02-28', end: '2028-03-01' }],
    });
    expect(slots).toEqual([]);
  });
});
