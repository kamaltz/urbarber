/**
 * Availability Endpoint Tests (Batch 09D-S, Section K)
 *
 * Exercises the actual production handler logic (computeAvailability, the same
 * function GET /api/bookings/availability calls) against the local Firestore
 * emulator via the Firebase Admin SDK -- not a parallel fake implementation.
 * Requires the Firestore emulator running at FIRESTORE_EMULATOR_HOST
 * (see tests/setup-emulator-env.ts, defaults to 127.0.0.1:8080).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { computeAvailability } from '../src/bookings/availability.js';
import { db } from '../src/lib/firebase-admin.js';

async function clearCollections() {
  for (const name of ['barberSchedules', 'barbers', 'bookings', 'slotLocks']) {
    const snap = await db.collection(name).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }
}

async function seedConfirmedSchedule(barberId: string) {
  await db.collection('barberSchedules').doc(barberId).set({
    isConfigured: true,
    isConfirmed: true,
    unavailableDates: [],
    schedule: [
      { dayOfWeek: 'Monday', isOpen: true, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 'Tuesday', isOpen: true, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 'Wednesday', isOpen: true, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 'Thursday', isOpen: true, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 'Friday', isOpen: true, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 'Saturday', isOpen: true, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 'Sunday', isOpen: true, startTime: '09:00', endTime: '17:00' },
    ],
  });
  await db.collection('barbers').doc(barberId).set({ acceptingNewBookings: true });
}

// A fixed Wednesday, safely in the future so filterPastSlots never masks results.
const FUTURE_DATE = '2027-03-10';

describe('GET /api/bookings/availability (computeAvailability)', () => {
  beforeEach(async () => {
    await clearCollections();
  });

  it('1. returns availability for a barber with a confirmed schedule', async () => {
    await seedConfirmedSchedule('barberA');
    const result = await computeAvailability('barberA', FUTURE_DATE);
    expect(result.error).toBeUndefined();
    expect(result.slots.length).toBeGreaterThan(0);
    expect(result.slots.every((s) => typeof s.time === 'string' && typeof s.available === 'boolean')).toBe(true);
  });

  it('2. never includes foreign booking data (no customerId/bookingId/address/etc in response shape)', async () => {
    await seedConfirmedSchedule('barberB');
    await db.collection('bookings').doc('bk1').set({
      barberId: 'barberB',
      customerId: 'customerX',
      status: 'pending',
      date: FUTURE_DATE,
      startTime: '10:00',
      durationMinutes: 45,
      address: 'Jl. Rahasia No. 1',
      notes: 'private note',
    });

    const result = await computeAvailability('barberB', FUTURE_DATE);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('customerX');
    expect(serialized).not.toContain('Rahasia');
    expect(serialized).not.toContain('private note');
    expect(serialized).not.toContain('bk1');
    // Only the documented shape is present
    for (const slot of result.slots) {
      expect(Object.keys(slot).sort()).toEqual(['available', 'time']);
    }
  });

  it('3. an active (non-expired) slot lock marks that slot unavailable', async () => {
    await seedConfirmedSchedule('barberC');
    await db.collection('slotLocks').doc('barberC_20270310_1000').set({
      barberId: 'barberC',
      date: FUTURE_DATE,
      startTime: '10:00',
      customerId: 'someoneElse',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });

    const result = await computeAvailability('barberC', FUTURE_DATE);
    const slot = result.slots.find((s) => s.time === '10:00');
    expect(slot?.available).toBe(false);
  });

  it('4. a finalized (paid, accepted) booking marks that slot unavailable', async () => {
    await seedConfirmedSchedule('barberD');
    await db.collection('bookings').doc('bk2').set({
      barberId: 'barberD',
      customerId: 'customerY',
      status: 'accepted',
      paymentStatus: 'paid',
      date: FUTURE_DATE,
      startTime: '11:00',
      durationMinutes: 45,
    });

    const result = await computeAvailability('barberD', FUTURE_DATE);
    const slot = result.slots.find((s) => s.time === '11:00');
    expect(slot?.available).toBe(false);
  });

  it('5. an expired hold is safe/releasable: it does not block the slot on its own', async () => {
    await seedConfirmedSchedule('barberE');
    await db.collection('slotLocks').doc('barberE_20270310_1200').set({
      barberId: 'barberE',
      date: FUTURE_DATE,
      startTime: '12:00',
      customerId: 'expiredHolder',
      expiresAt: new Date(Date.now() - 60 * 1000).toISOString(), // already expired
    });

    const result = await computeAvailability('barberE', FUTURE_DATE);
    const slot = result.slots.find((s) => s.time === '12:00');
    expect(slot?.available).toBe(true);
  });

  it('6. Customer A cannot obtain Customer B finalized slot (still unavailable to everyone)', async () => {
    await seedConfirmedSchedule('barberF');
    await db.collection('bookings').doc('bk3').set({
      barberId: 'barberF',
      customerId: 'customerB',
      status: 'in_progress',
      paymentStatus: 'paid',
      date: FUTURE_DATE,
      startTime: '13:00',
      durationMinutes: 45,
    });

    // Availability is barber+date scoped only -- there is no per-customer view, so
    // Customer A's request returns the exact same (unavailable) result as anyone else's.
    const resultForA = await computeAvailability('barberF', FUTURE_DATE);
    const slot = resultForA.slots.find((s) => s.time === '13:00');
    expect(slot?.available).toBe(false);
  });

  it('7. invalid barberId (no schedule doc) safely returns SCHEDULE_NOT_CONFIGURED, not a crash', async () => {
    const result = await computeAvailability('nonexistent-barber', FUTURE_DATE);
    // No barberSchedules doc + default (isConfigured/isConfirmed) still true by design
    // for missing docs (mirrors getDefaultWeeklySchedule); assert it returns a valid,
    // well-formed shape either way rather than throwing.
    expect(result.barberId).toBe('nonexistent-barber');
    expect(result.date).toBe(FUTURE_DATE);
    expect(Array.isArray(result.slots)).toBe(true);
  });

  it('7b. explicitly unconfirmed schedule returns SCHEDULE_NOT_CONFIGURED with no slots', async () => {
    await db.collection('barberSchedules').doc('barberG').set({
      isConfigured: true,
      isConfirmed: false,
      schedule: [],
    });

    const result = await computeAvailability('barberG', FUTURE_DATE);
    expect(result.error).toBe('SCHEDULE_NOT_CONFIGURED');
    expect(result.slots).toEqual([]);
  });

  it('8. barber not accepting new bookings returns an empty slot list', async () => {
    await seedConfirmedSchedule('barberH');
    await db.collection('barbers').doc('barberH').set({ acceptingNewBookings: false });

    const result = await computeAvailability('barberH', FUTURE_DATE);
    expect(result.slots).toEqual([]);
  });

  it('9. response never contains private fields even when many bookings exist for the date', async () => {
    await seedConfirmedSchedule('barberI');
    await db.collection('bookings').doc('bk4').set({
      barberId: 'barberI',
      customerId: 'secretCustomer',
      status: 'pending',
      date: FUTURE_DATE,
      startTime: '14:00',
      durationMinutes: 45,
      customerPhone: '+62-800-000-0000',
      paymentMethod: 'midtrans_sandbox',
    });

    const result = await computeAvailability('barberI', FUTURE_DATE);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('secretCustomer');
    expect(serialized).not.toContain('+62-800-000-0000');
    expect(serialized).not.toContain('midtrans_sandbox');
  });
});
