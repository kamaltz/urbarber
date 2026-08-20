/**
 * Trusted-backend slot availability calculation.
 *
 * Replaces the deprecated client-side Firestore query
 * (bookingRepository.getAvailableSlots -> where('barberId','==',barberId) across ALL
 * bookings for a barber), which is incompatible with participant-only booking read
 * rules and would leak other customers' booking documents to the requesting customer.
 *
 * This module uses the Firebase Admin SDK (server-side, bypasses Firestore rules) to
 * read authoritative bookings and slot locks, and returns ONLY {time, available} pairs.
 * No customerId, bookingId, address, notes, payment, contact, or tracking data is ever
 * included in the response.
 */

import { db } from '../lib/firebase-admin.js';
import { generateTimeSlots, type UnavailableDateRange, type WorkingHours } from './slot-generator.js';

/** Defensive parse of scheduleData.unavailableDateRanges -- a malformed
 * range (missing/non-string start or end) is dropped rather than allowed to
 * silently block every date via a broken comparison. */
function parseUnavailableDateRanges(raw: unknown): UnavailableDateRange[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (r): r is UnavailableDateRange =>
      r && typeof r === 'object' && typeof r.start === 'string' && typeof r.end === 'string'
  );
}

const DEFAULT_SCHEDULE_DAYS: Array<{
  dayOfWeek: string;
  isOpen: boolean;
  startTime: string;
  endTime: string;
}> = [
  { dayOfWeek: 'Monday', isOpen: true, startTime: '09:00', endTime: '21:00' },
  { dayOfWeek: 'Tuesday', isOpen: true, startTime: '09:00', endTime: '21:00' },
  { dayOfWeek: 'Wednesday', isOpen: true, startTime: '09:00', endTime: '21:00' },
  { dayOfWeek: 'Thursday', isOpen: true, startTime: '09:00', endTime: '21:00' },
  { dayOfWeek: 'Friday', isOpen: true, startTime: '09:00', endTime: '21:00' },
  { dayOfWeek: 'Saturday', isOpen: true, startTime: '09:00', endTime: '21:00' },
  { dayOfWeek: 'Sunday', isOpen: true, startTime: '10:00', endTime: '18:00' },
];

export interface AvailabilitySlot {
  time: string;
  available: boolean;
}

export interface AvailabilityResult {
  barberId: string;
  date: string;
  slots: AvailabilitySlot[];
  error?: string;
}

export async function computeAvailability(
  barberId: string,
  date: string,
  options?: { serviceDurationMinutes?: number; isHomeService?: boolean }
): Promise<AvailabilityResult> {
  // 1. Fetch barber schedule (defaults mirror getDefaultWeeklySchedule client behavior)
  const scheduleSnap = await db.collection('barberSchedules').doc(barberId).get();
  const scheduleData = scheduleSnap.exists ? scheduleSnap.data() || {} : {};
  const rawSchedule: Array<Record<string, any>> =
    Array.isArray(scheduleData.schedule) && scheduleData.schedule.length > 0
      ? scheduleData.schedule
      : DEFAULT_SCHEDULE_DAYS;
  const isConfigured = scheduleSnap.exists ? scheduleData.isConfigured !== false : true;
  const isConfirmed = scheduleSnap.exists ? scheduleData.isConfirmed !== false : true;
  const unavailableDates: string[] = Array.isArray(scheduleData.unavailableDates)
    ? scheduleData.unavailableDates
    : [];
  const unavailableDateRanges = parseUnavailableDateRanges(scheduleData.unavailableDateRanges);

  if (!isConfigured || !isConfirmed) {
    return { barberId, date, slots: [], error: 'SCHEDULE_NOT_CONFIGURED' };
  }

  // 2. Fetch barber profile for acceptingNewBookings & travel buffer
  const barberSnap = await db.collection('barbers').doc(barberId).get();
  const barberData = barberSnap.exists ? barberSnap.data() || {} : {};
  const acceptingNewBookings = barberData.acceptingNewBookings ?? true;
  const travelBufferMinutes = barberData.homeServiceTravelBufferMinutes || 15;

  // 3. Resolve day-of-week working hours
  const [year, month, day] = date.split('-').map(Number);
  const d = new Date(year, (month || 1) - 1, day || 1);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = dayNames[d.getDay()];

  const dayConfig = rawSchedule.find(
    (s) => String(s.dayOfWeek || '').toLowerCase() === dayOfWeek.toLowerCase()
  );

  const workingHours: WorkingHours = dayConfig
    ? {
        isOpen: dayConfig.isOpen,
        openTime: dayConfig.startTime || dayConfig.openTime || '09:00',
        closeTime: dayConfig.endTime || dayConfig.closeTime || '21:00',
      }
    : { isOpen: true, openTime: '09:00', closeTime: '21:00' };

  // 4. Fetch active bookings for this barber (Admin SDK; not exposed to client).
  // FINALIZED (paid, accepted/in_progress) and payment-intent 'pending' bookings both
  // block the slot; only terminal statuses (cancelled/rejected/completed) do not.
  const bookingsSnap = await db
    .collection('bookings')
    .where('barberId', '==', barberId)
    .where('status', 'in', ['pending', 'accepted', 'in_progress'])
    .get();

  const existingBookings = bookingsSnap.docs
    .map((docSnap) => {
      const b = docSnap.data();
      const bDate = b.date || b.bookingDate || b.scheduledAt?.split?.('T')?.[0];
      if (bDate !== date) return null;
      return {
        startTime: b.startTime || b.scheduledTime || '00:00',
        durationMinutes: b.durationMinutes || options?.serviceDurationMinutes || 45,
        status: b.status,
      };
    })
    .filter((v): v is { startTime: string; durationMinutes: number; status: string } => v !== null);

  // 5. Fetch active (non-expired) TEMPORARILY_HELD slot locks for this barber/date.
  // Expired holds are excluded here (safe-releasable) so they never block a slot merely
  // because their TTL string wasn't reconciled yet; a paid FINALIZED booking is never
  // represented as a lock alone -- it also has a booking doc counted above.
  const locksSnap = await db
    .collection('slotLocks')
    .where('barberId', '==', barberId)
    .where('date', '==', date)
    .get();

  const nowMs = Date.now();
  const slotLocks = locksSnap.docs
    .map((docSnap) => {
      const l = docSnap.data();
      const expiresAtMs = l.expiresAt ? new Date(l.expiresAt).getTime() : 0;
      if (!expiresAtMs || expiresAtMs <= nowMs) return null;
      if (l.status === 'finalized') return null; // covered by the booking doc itself
      return {
        startTime: l.startTime || '00:00',
        durationMinutes: options?.serviceDurationMinutes || 45,
        expiresAt: expiresAtMs,
      };
    })
    .filter((v): v is { startTime: string; durationMinutes: number; expiresAt: number } => v !== null);

  // 6. Generate slots using the pure engine (never leaks who/what booked a slot)
  const generatedSlots = generateTimeSlots({
    date,
    workingHours,
    serviceDurationMinutes: options?.serviceDurationMinutes || 45,
    slotIntervalMinutes: 30,
    unavailableDates,
    unavailableDateRanges,
    existingBookings,
    slotLocks,
    homeServiceTravelBufferMinutes: travelBufferMinutes,
    acceptingNewBookings,
    isHomeService: options?.isHomeService || false,
    timeZone: 'Asia/Jakarta',
  });

  return {
    barberId,
    date,
    slots: generatedSlots.map((s) => ({ time: s.time, available: s.available })),
  };
}
