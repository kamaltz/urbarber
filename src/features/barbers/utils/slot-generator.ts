/**
 * Slot Generator & Availability Calculation Engine
 * Pure, deterministic functions for time slot generation, overlap detection, travel buffer application,
 * and working period constraints.
 */

import {
  BOOKING_TIME_ZONE,
  evaluateSlotEligibility,
  MIN_BOOKING_LEAD_TIME_MINUTES,
} from '@/features/bookings/utils/slot-datetime';

export { MIN_BOOKING_LEAD_TIME_MINUTES };

export interface BarberTimeSlot {
  id: string;
  time: string; // HH:mm format
  endTime: string; // HH:mm format
  available: boolean;
  reason?: string;
}

export interface WorkingHours {
  isOpen: boolean;
  openTime: string; // HH:mm format, e.g. "09:00"
  closeTime: string; // HH:mm format, e.g. "18:00"
}

export interface BreakPeriod {
  start: string; // HH:mm
  end: string; // HH:mm
}

export interface BookingPeriod {
  startTime: string; // HH:mm
  durationMinutes: number;
  status: string;
}

export interface SlotLockPeriod {
  startTime: string; // HH:mm
  durationMinutes: number;
  expiresAt: number; // Timestamp in ms
}

export interface GenerateTimeSlotsParams {
  date: string; // YYYY-MM-DD
  workingHours?: WorkingHours;
  serviceDurationMinutes: number;
  slotIntervalMinutes?: number; // Default 30 minutes
  breaks?: BreakPeriod[];
  unavailableDates?: string[];
  existingBookings?: BookingPeriod[];
  slotLocks?: SlotLockPeriod[];
  homeServiceTravelBufferMinutes?: number;
  acceptingNewBookings?: boolean;
  isHomeService?: boolean;
  timeZone?: string; // Default 'Asia/Jakarta'
  /** Injectable clock for deterministic tests; defaults to real time. Drives both
   *  slot-lock expiry and date-aware slot eligibility. */
  now?: Date;
}

/**
 * Calculate slot end time string given start time and duration in minutes
 */
export function calculateSlotEnd(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMins = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
}

/**
 * Convert HH:mm to minutes from midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if a slot range is entirely inside the working period
 */
export function isSlotInsideWorkingPeriod(
  slotStart: string,
  slotEnd: string,
  openTime: string,
  closeTime: string
): boolean {
  const startMins = timeToMinutes(slotStart);
  const endMins = timeToMinutes(slotEnd);
  const openMins = timeToMinutes(openTime);
  const closeMins = timeToMinutes(closeTime);

  return startMins >= openMins && endMins <= closeMins;
}

/**
 * Check if two time ranges overlap
 */
export function doesSlotOverlap(
  slot1Start: string,
  slot1End: string,
  slot2Start: string,
  slot2End: string
): boolean {
  const s1 = timeToMinutes(slot1Start);
  const e1 = timeToMinutes(slot1End);
  const s2 = timeToMinutes(slot2Start);
  const e2 = timeToMinutes(slot2End);

  return s1 < e2 && e1 > s2;
}

/**
 * Check if a date is in the list of unavailable dates
 */
export function applyUnavailableDates(date: string, unavailableDates: string[] = []): boolean {
  return unavailableDates.includes(date);
}

/**
 * Expand a list of booked time ranges with a travel buffer (before and after)
 */
export function applyTravelBuffer(
  bookedRanges: { start: string; end: string }[],
  travelBufferMinutes: number = 0
): { start: string; end: string }[] {
  if (travelBufferMinutes <= 0) return bookedRanges;

  return bookedRanges.map((range) => {
    const startMins = Math.max(0, timeToMinutes(range.start) - travelBufferMinutes);
    const endMins = Math.min(1439, timeToMinutes(range.end) + travelBufferMinutes);

    const sH = Math.floor(startMins / 60);
    const sM = startMins % 60;
    const eH = Math.floor(endMins / 60);
    const eM = endMins % 60;

    return {
      start: `${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')}`,
      end: `${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}`,
    };
  });
}

/**
 * Mark every slot whose full start datetime (date + HH:mm in `timeZone`) is already
 * elapsed or inside the minimum lead-time window as unavailable.
 *
 * Date-aware by construction: eligibility is decided per slot from its own
 * `date + time` timestamp, so this function no longer needs (and no longer has) a
 * `date === today` short-circuit, and no longer compares a slot's minutes-from-midnight
 * against the current minutes-from-midnight. That comparison was date-blind: it made
 * every slot on a past date look available, and exempted future dates from the
 * lead-time rule (tomorrow 00:00 bookable at 23:30 tonight).
 *
 * `now` is injectable so the rule is testable at a fixed instant.
 */
export function filterPastSlots(
  slots: BarberTimeSlot[],
  date: string,
  timeZone = BOOKING_TIME_ZONE,
  now: Date = new Date()
): BarberTimeSlot[] {
  return slots.map((slot) => {
    const eligibility = evaluateSlotEligibility({ date, startTime: slot.time, now, timeZone });
    if (eligibility.bookable) {
      return slot;
    }
    return { ...slot, available: false, reason: eligibility.reason };
  });
}

/**
 * Main pure slot generation function
 */
export function generateTimeSlots(params: GenerateTimeSlotsParams): BarberTimeSlot[] {
  const {
    date,
    workingHours,
    serviceDurationMinutes,
    slotIntervalMinutes = 30,
    breaks = [],
    unavailableDates = [],
    existingBookings = [],
    slotLocks = [],
    homeServiceTravelBufferMinutes = 0,
    acceptingNewBookings = true,
    isHomeService = false,
    timeZone = BOOKING_TIME_ZONE,
    now = new Date(),
  } = params;

  // 1. Check if barber accepts new bookings
  if (!acceptingNewBookings) {
    return [];
  }

  // 2. Check unavailable dates
  if (applyUnavailableDates(date, unavailableDates)) {
    return [];
  }

  // 3. Check working hours configuration
  if (!workingHours || !workingHours.isOpen || !workingHours.openTime || !workingHours.closeTime) {
    return [];
  }

  const openMins = timeToMinutes(workingHours.openTime);
  const closeMins = timeToMinutes(workingHours.closeTime);

  if (openMins >= closeMins || serviceDurationMinutes <= 0) {
    return [];
  }

  // 4. Build active occupied ranges from existing bookings & valid locks
  const activeBookingRanges: { start: string; end: string }[] = [];

  // Terminal status bookings (cancelled, rejected, failed, expired) do NOT block slots
  const activeStatuses = ['pending', 'accepted', 'in_progress'];
  for (const b of existingBookings) {
    if (activeStatuses.includes(b.status)) {
      const bEnd = calculateSlotEnd(b.startTime, b.durationMinutes);
      activeBookingRanges.push({ start: b.startTime, end: bEnd });
    }
  }

  const nowMs = now.getTime();
  for (const lock of slotLocks) {
    if (lock.expiresAt > nowMs) {
      const lEnd = calculateSlotEnd(lock.startTime, lock.durationMinutes);
      activeBookingRanges.push({ start: lock.startTime, end: lEnd });
    }
  }

  // Apply travel buffer if home service
  const travelBuffer = isHomeService ? homeServiceTravelBufferMinutes : 0;
  const occupiedRanges = applyTravelBuffer(activeBookingRanges, travelBuffer);

  // 5. Generate potential slot start times
  const rawSlots: BarberTimeSlot[] = [];
  let currentMins = openMins;

  while (currentMins < closeMins) {
    const hours = Math.floor(currentMins / 60);
    const mins = currentMins % 60;
    const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    const endTimeStr = calculateSlotEnd(timeStr, serviceDurationMinutes);

    // Check if slot fits inside working hours
    const fitsWorkingHours = isSlotInsideWorkingPeriod(
      timeStr,
      endTimeStr,
      workingHours.openTime,
      workingHours.closeTime
    );

    let isAvailable = fitsWorkingHours;
    let reason: string | undefined;

    if (!fitsWorkingHours) {
      reason = 'Melewati jam operasional';
    }

    // Check overlap with breaks
    if (isAvailable) {
      for (const brk of breaks) {
        if (doesSlotOverlap(timeStr, endTimeStr, brk.start, brk.end)) {
          isAvailable = false;
          reason = 'Waktu istirahat';
          break;
        }
      }
    }

    // Check overlap with occupied ranges (bookings / locks / travel buffers)
    if (isAvailable) {
      for (const range of occupiedRanges) {
        if (doesSlotOverlap(timeStr, endTimeStr, range.start, range.end)) {
          isAvailable = false;
          reason = 'Sudah dibooking';
          break;
        }
      }
    }

    rawSlots.push({
      id: `slot-${date}-${timeStr}`,
      time: timeStr,
      endTime: endTimeStr,
      available: isAvailable,
      reason,
    });

    currentMins += slotIntervalMinutes;
  }

  // 6. Apply date-aware eligibility (elapsed + minimum lead time) to every slot
  return filterPastSlots(rawSlots, date, timeZone, now);
}
