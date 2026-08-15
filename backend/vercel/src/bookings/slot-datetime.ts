/**
 * Canonical date-aware slot eligibility (Backend Port).
 *
 * Ported from src/features/bookings/utils/slot-datetime.ts. Keep the two in sync:
 * if the client and the trusted backend disagree about which slots are eligible,
 * a customer either sees bookable slots the server will reject at payment time, or
 * is blocked from slots the server would have accepted.
 *
 * The rule is a single comparison between two absolute instants:
 *
 *     slotStart(date + startTime, Asia/Jakarta) >= serverNow + MIN_BOOKING_LEAD_TIME
 *
 * It deliberately does NOT branch on "is the requested date today?". The previous
 * implementation compared a slot's HH:mm against the current HH:mm (minutes from
 * midnight) behind a `date === today` guard, so a past date and a future date both
 * skipped the rule entirely -- yesterday reported every slot as available, and
 * tomorrow 00:00 was bookable at 23:30 tonight with only 30 minutes of lead time.
 *
 * Framework-agnostic: no Firebase/Node-specific imports here.
 */

export const MIN_BOOKING_LEAD_TIME_MINUTES = 60;

/** URBarber operates in WIB. Server time is UTC, so every date/time decision must be
 *  resolved through this zone rather than the host's local zone. */
export const BOOKING_TIME_ZONE = 'Asia/Jakarta';

const MS_PER_MINUTE = 60_000;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{1,2}):(\d{2})$/;

export interface SlotDateTimeInput {
  /** YYYY-MM-DD, interpreted in `timeZone`. */
  date: string;
  /** HH:mm, interpreted in `timeZone`. */
  startTime: string;
  /** Injectable clock. Tests pass a fixed instant; production passes real server time. */
  now?: Date;
  timeZone?: string;
  leadTimeMinutes?: number;
}

export type SlotIneligibilityCode = 'INVALID_SLOT' | 'SLOT_IN_PAST' | 'SLOT_BELOW_LEAD_TIME';

export type SlotEligibility =
  | { bookable: true }
  | { bookable: false; code: SlotIneligibilityCode; reason: string };

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
    // Some ICU builds render midnight as hour "24" under hour12:false.
    hour: read('hour') % 24,
    minute: read('minute'),
    second: read('second'),
  };
}

/** Offset (ms) between `timeZone` wall-clock time and UTC at the given instant. */
function zoneOffsetMs(instantMs: number, timeZone: string): number {
  const p = readZonedParts(new Date(instantMs), timeZone);
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asIfUtc - Math.floor(instantMs / 1000) * 1000;
}

/**
 * Convert `YYYY-MM-DD` + `HH:mm`, read as wall-clock time in `timeZone`, into an
 * absolute epoch-ms instant directly comparable with Date.now() (authoritative
 * server time). Returns null for malformed or non-existent civil dates.
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

/** Current calendar date (YYYY-MM-DD) in the canonical zone. */
export function getZonedToday(now: Date = new Date(), timeZone: string = BOOKING_TIME_ZONE): string {
  const p = readZonedParts(now, timeZone);
  return `${String(p.year).padStart(4, '0')}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** True when `date` is strictly before today in the canonical zone. */
export function isPastDate(
  date: string,
  now: Date = new Date(),
  timeZone: string = BOOKING_TIME_ZONE
): boolean {
  return date < getZonedToday(now, timeZone);
}

/**
 * The canonical eligibility rule. One timestamp comparison covers every case:
 *
 *   serverNow = 2026-08-16 14:20 WIB, lead = 60m -> earliest bookable start = 15:20
 *     2026-08-15 15:30 -> SLOT_IN_PAST          (yesterday)
 *     2026-08-16 14:00 -> SLOT_IN_PAST          (today, already elapsed)
 *     2026-08-16 15:00 -> SLOT_BELOW_LEAD_TIME  (today, inside the 60m window)
 *     2026-08-16 15:20 -> bookable              (boundary, inclusive)
 *     2026-08-17 09:00 -> bookable              (tomorrow morning stays open even
 *                                                though 09:00 elapsed *today*)
 *   serverNow = 2026-08-16 23:30 WIB
 *     2026-08-17 00:00 -> SLOT_BELOW_LEAD_TIME  (future date, still only 30m away)
 *     2026-08-17 00:30 -> bookable              (boundary, inclusive)
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
