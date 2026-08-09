/**
 * Slot Generator & Availability Calculation Engine (Backend Port)
 * Pure, deterministic functions for time slot generation, overlap detection, travel buffer
 * application, and working period constraints.
 *
 * Ported from src/features/barbers/utils/slot-generator.ts to keep the trusted-backend
 * availability endpoint in parity with the (deprecated client-preview) slot engine.
 * Framework-agnostic; do not add Firebase/Node-specific imports here.
 */

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
}

export function calculateSlotEnd(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMins = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

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

export function applyUnavailableDates(date: string, unavailableDates: string[] = []): boolean {
  return unavailableDates.includes(date);
}

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

export function filterPastSlots(
  slots: BarberTimeSlot[],
  date: string,
  timeZone = 'Asia/Jakarta'
): BarberTimeSlot[] {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };

  const formatter = new Intl.DateTimeFormat('en-CA', options);
  const parts = formatter.formatToParts(now);

  const year = parts.find((p) => p.type === 'year')?.value || '';
  const month = parts.find((p) => p.type === 'month')?.value || '';
  const day = parts.find((p) => p.type === 'day')?.value || '';
  const hour = parts.find((p) => p.type === 'hour')?.value || '00';
  const minute = parts.find((p) => p.type === 'minute')?.value || '00';

  const todayStr = `${year}-${month}-${day}`;

  if (date !== todayStr) {
    return slots;
  }

  const currentMinutes = parseInt(hour, 10) * 60 + parseInt(minute, 10);

  return slots.map((slot) => {
    const slotMinutes = timeToMinutes(slot.time);
    if (slotMinutes <= currentMinutes) {
      return {
        ...slot,
        available: false,
        reason: 'Waktu telah berlalu',
      };
    }
    return slot;
  });
}

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
    timeZone = 'Asia/Jakarta',
  } = params;

  if (!acceptingNewBookings) {
    return [];
  }

  if (applyUnavailableDates(date, unavailableDates)) {
    return [];
  }

  if (!workingHours || !workingHours.isOpen || !workingHours.openTime || !workingHours.closeTime) {
    return [];
  }

  const openMins = timeToMinutes(workingHours.openTime);
  const closeMins = timeToMinutes(workingHours.closeTime);

  if (openMins >= closeMins || serviceDurationMinutes <= 0) {
    return [];
  }

  const activeBookingRanges: { start: string; end: string }[] = [];

  // Terminal status bookings (cancelled, rejected, failed, expired) do NOT block slots.
  // Note: 'pending' includes unpaid payment-intent bookings, which intentionally still
  // block the slot (mirrors the slotLock hold) until they are cancelled/expired.
  const activeStatuses = ['pending', 'accepted', 'in_progress'];
  for (const b of existingBookings) {
    if (activeStatuses.includes(b.status)) {
      const bEnd = calculateSlotEnd(b.startTime, b.durationMinutes);
      activeBookingRanges.push({ start: b.startTime, end: bEnd });
    }
  }

  const nowMs = Date.now();
  for (const lock of slotLocks) {
    if (lock.expiresAt > nowMs) {
      const lEnd = calculateSlotEnd(lock.startTime, lock.durationMinutes);
      activeBookingRanges.push({ start: lock.startTime, end: lEnd });
    }
  }

  const travelBuffer = isHomeService ? homeServiceTravelBufferMinutes : 0;
  const occupiedRanges = applyTravelBuffer(activeBookingRanges, travelBuffer);

  const rawSlots: BarberTimeSlot[] = [];
  let currentMins = openMins;

  while (currentMins < closeMins) {
    const hours = Math.floor(currentMins / 60);
    const mins = currentMins % 60;
    const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    const endTimeStr = calculateSlotEnd(timeStr, serviceDurationMinutes);

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

    if (isAvailable) {
      for (const brk of breaks) {
        if (doesSlotOverlap(timeStr, endTimeStr, brk.start, brk.end)) {
          isAvailable = false;
          reason = 'Waktu istirahat';
          break;
        }
      }
    }

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

  return filterPastSlots(rawSlots, date, timeZone);
}
