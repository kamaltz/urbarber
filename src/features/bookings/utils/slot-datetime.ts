/**
 * Canonical date-aware slot eligibility.
 *
 * Every layer that decides "may this slot still be booked?" must go through this
 * module. The rule is a single comparison between two absolute instants:
 *
 *     slotStart(selectedDate + startTime, Asia/Jakarta) >= now + MIN_BOOKING_LEAD_TIME
 *
 * It deliberately does NOT branch on "is the selected date today?". The previous
 * implementation compared a slot's HH:mm against the current HH:mm (minutes from
 * midnight) and guarded that with a `date === today` check, which meant:
 *   - a future date skipped the lead-time rule entirely (booking tomorrow 00:00 at
 *     23:30 tonight was accepted, only 30 minutes of lead time away), and
 *   - a past date also skipped it (every slot on a bygone date reported available).
 * Comparing full timestamps makes both cases fall out of the same expression: a
 * future date is naturally far past `now + lead`, and yesterday is naturally before it.
 *
 * The backend keeps a byte-for-byte port of this logic in
 * backend/vercel/src/bookings/slot-datetime.ts so the client and the trusted server
 * can never disagree about which slots are eligible.
 */

import { MIN_BOOKING_LEAD_TIME_MINUTES } from '@/types/domain';

export { MIN_BOOKING_LEAD_TIME_MINUTES };

/** URBarber operates in WIB. All date/time reasoning is anchored to this zone,
 *  never to the device's local zone (a customer travelling, or an emulator left on
 *  UTC, must still see the same slots as the barber). */
export const BOOKING_TIME_ZONE = 'Asia/Jakarta';

const MS_PER_MINUTE = 60_000;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{1,2}):(\d{2})$/;

export interface SlotDateTimeInput {
  /** YYYY-MM-DD, interpreted in `timeZone` (never in the device's local zone). */
  date: string;
  /** HH:mm, interpreted in `timeZone`. */
  startTime: string;
  /** Injectable clock. Tests pass a fixed instant; production passes real time. */
  now?: Date;
  timeZone?: string;
  leadTimeMinutes?: number;
}

export type SlotIneligibilityCode = 'INVALID_SLOT' | 'SLOT_IN_PAST' | 'SLOT_BELOW_LEAD_TIME';

export type SlotEligibility =
  | { bookable: true }
  | { bookable: false; code: SlotIneligibilityCode; reason: string };

/** Indonesian copy already shown by the slot grid; kept here so every layer that
 *  rejects a slot reports the same wording. */
export const SLOT_INELIGIBILITY_REASON: Record<SlotIneligibilityCode, string> = {
  INVALID_SLOT: 'Tanggal atau waktu tidak valid',
  SLOT_IN_PAST: 'Waktu telah berlalu',
  SLOT_BELOW_LEAD_TIME: `Pemesanan minimal ${MIN_BOOKING_LEAD_TIME_MINUTES} menit sebelumnya`,
};

function buildFormatter(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

interface WallClockParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function readZonedParts(instant: Date, timeZone: string): WallClockParts {
  const parts = buildFormatter(timeZone).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value ?? '0');

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    // Some ICU builds render midnight as hour "24" under hour12:false; normalize
    // so 24:00 of day N never reads as an hour beyond the day it belongs to.
    hour: read('hour') % 24,
    minute: read('minute'),
    second: read('second'),
  };
}

/**
 * Offset (ms) between `timeZone` wall-clock time and UTC at the given instant.
 * Positive east of Greenwich (Asia/Jakarta = +7h).
 */
function zoneOffsetMs(instantMs: number, timeZone: string): number {
  const p = readZonedParts(new Date(instantMs), timeZone);
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asIfUtc - Math.floor(instantMs / 1000) * 1000;
}

/**
 * Convert a `YYYY-MM-DD` + `HH:mm` pair, read as wall-clock time in `timeZone`,
 * into an absolute epoch-ms instant that is directly comparable with Date.now().
 *
 * Returns null for malformed or non-existent dates (e.g. '2026-02-31') rather than
 * silently rolling over into the next month.
 *
 * The two-pass offset resolution is the standard technique for zones with DST: the
 * first pass guesses the instant using the offset at the same wall clock in UTC, the
 * second re-reads the offset at that guess. Asia/Jakarta has had a fixed +07:00
 * offset since 1964, so the second pass is a no-op here, but keeping it means this
 * helper stays correct if the canonical zone ever changes.
 */
export function toSlotEpochMs(
  date: string,
  startTime: string,
  timeZone: string = BOOKING_TIME_ZONE
): number | null {
  const dateMatch = DATE_PATTERN.exec((date || '').trim());
  const timeMatch = TIME_PATTERN.exec((startTime || '').trim());
  if (!dateMatch || !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (hour > 23 || minute > 59) return null;

  const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  // Date.UTC rolls invalid civil dates forward (Feb 31 -> Mar 3); reject instead.
  const rolled = new Date(wallClockAsUtc);
  if (
    rolled.getUTCFullYear() !== year ||
    rolled.getUTCMonth() !== month - 1 ||
    rolled.getUTCDate() !== day
  ) {
    return null;
  }

  const firstGuess = wallClockAsUtc - zoneOffsetMs(wallClockAsUtc, timeZone);
  return wallClockAsUtc - zoneOffsetMs(firstGuess, timeZone);
}

/** Current calendar date (YYYY-MM-DD) in the canonical zone. Use this instead of
 *  `new Date().toISOString().split('T')[0]` (UTC -- seven hours behind WIB, so
 *  between 00:00 and 07:00 local it returns *yesterday*) and instead of the device's
 *  local date. */
export function getZonedToday(now: Date = new Date(), timeZone: string = BOOKING_TIME_ZONE): string {
  const p = readZonedParts(now, timeZone);
  return `${String(p.year).padStart(4, '0')}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** Compare two YYYY-MM-DD strings as calendar dates. Lexicographic ordering is exact
 *  for zero-padded ISO dates, so no Date construction (and no zone drift) is needed. */
export function isDateBefore(date: string, otherDate: string): boolean {
  return date < otherDate;
}

/** True when `date` is strictly before today in the canonical zone. */
export function isPastDate(
  date: string,
  now: Date = new Date(),
  timeZone: string = BOOKING_TIME_ZONE
): boolean {
  return isDateBefore(date, getZonedToday(now, timeZone));
}

/**
 * The canonical eligibility rule. One timestamp comparison covers every case:
 *
 *   now = 2026-08-16 14:20 WIB, lead = 60m  ->  earliest bookable start = 15:20
 *     2026-08-15 15:30  -> SLOT_IN_PAST          (yesterday)
 *     2026-08-16 14:00  -> SLOT_IN_PAST          (today, already elapsed)
 *     2026-08-16 15:00  -> SLOT_BELOW_LEAD_TIME  (today, inside the 60m window)
 *     2026-08-16 15:20  -> bookable              (boundary, inclusive)
 *     2026-08-17 09:00  -> bookable              (tomorrow morning; the fact that
 *                                                 09:00 already passed *today* is
 *                                                 irrelevant -- different day)
 *   now = 2026-08-16 23:30 WIB
 *     2026-08-17 00:00  -> SLOT_BELOW_LEAD_TIME  (tomorrow, but only 30m away)
 *     2026-08-17 00:30  -> bookable              (boundary, inclusive)
 */
export function evaluateSlotEligibility({
  date,
  startTime,
  now = new Date(),
  timeZone = BOOKING_TIME_ZONE,
  leadTimeMinutes = MIN_BOOKING_LEAD_TIME_MINUTES,
}: SlotDateTimeInput): SlotEligibility {
  const slotEpochMs = toSlotEpochMs(date, startTime, timeZone);
  if (slotEpochMs === null) {
    return { bookable: false, code: 'INVALID_SLOT', reason: SLOT_INELIGIBILITY_REASON.INVALID_SLOT };
  }

  const nowMs = now.getTime();
  if (slotEpochMs <= nowMs) {
    return { bookable: false, code: 'SLOT_IN_PAST', reason: SLOT_INELIGIBILITY_REASON.SLOT_IN_PAST };
  }

  if (slotEpochMs < nowMs + leadTimeMinutes * MS_PER_MINUTE) {
    return {
      bookable: false,
      code: 'SLOT_BELOW_LEAD_TIME',
      reason: SLOT_INELIGIBILITY_REASON.SLOT_BELOW_LEAD_TIME,
    };
  }

  return { bookable: true };
}

/** Boolean convenience wrapper around evaluateSlotEligibility. */
export function isSlotBookable(input: SlotDateTimeInput): boolean {
  return evaluateSlotEligibility(input).bookable;
}
