/**
 * Payment-First booking-exclusivity invariant: a customer must not be able to
 * hold more than one active booking (assertNoActiveBooking, src/bookings/active-booking-guard.ts),
 * wired into POST /api/payments/create's booking-creation transaction (api/payments.ts).
 *
 * Uses the real Firestore emulator (not mocks), mirroring the convention in
 * slot-ownership-race.test.ts.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ACTIVE_BOOKING_STATUSES,
  assertNoActiveBooking,
  CustomerHasActiveBookingError,
} from '../src/bookings/active-booking-guard.js';
import { db } from '../src/lib/firebase-admin.js';

const CUSTOMER = 'cust-active-booking-guard';
const BOOKING_EXISTING = 'booking-active-guard-existing';
const BOOKING_NEW_A = 'booking-active-guard-new-a';
const BOOKING_NEW_B = 'booking-active-guard-new-b';

function booking(bookingId: string, customerId: string, status: string) {
  return {
    id: bookingId,
    customerId,
    barberId: 'barber-active-guard',
    serviceId: 'svc-active-guard',
    date: '2026-09-20',
    startTime: '10:00',
    price: 30000,
    status,
  };
}

async function cleanup() {
  await Promise.all(
    [BOOKING_EXISTING, BOOKING_NEW_A, BOOKING_NEW_B].map((id) => db.collection('bookings').doc(id).delete())
  );
}

describe('assertNoActiveBooking (one-active-booking-per-customer invariant)', () => {
  beforeEach(cleanup);

  const BLOCKING_STATUSES = ['pending', 'accepted', 'in_progress'];
  const NON_BLOCKING_STATUSES = ['completed', 'cancelled', 'rejected'];

  it('allows a new booking when the customer has no bookings at all', async () => {
    await expect(db.runTransaction((t) => assertNoActiveBooking(t, db, CUSTOMER))).resolves.toBeUndefined();
  });

  it.each(BLOCKING_STATUSES)('blocks a new booking when an existing booking has status "%s"', async (status) => {
    await db.collection('bookings').doc(BOOKING_EXISTING).set(booking(BOOKING_EXISTING, CUSTOMER, status));

    await expect(db.runTransaction((t) => assertNoActiveBooking(t, db, CUSTOMER))).rejects.toMatchObject({
      bookingId: BOOKING_EXISTING,
      status,
    });
    await expect(db.runTransaction((t) => assertNoActiveBooking(t, db, CUSTOMER))).rejects.toBeInstanceOf(
      CustomerHasActiveBookingError
    );
  });

  it.each(NON_BLOCKING_STATUSES)('allows a new booking when the only existing booking has final status "%s"', async (status) => {
    await db.collection('bookings').doc(BOOKING_EXISTING).set(booking(BOOKING_EXISTING, CUSTOMER, status));

    await expect(db.runTransaction((t) => assertNoActiveBooking(t, db, CUSTOMER))).resolves.toBeUndefined();
  });

  it('never blocks a different customer', async () => {
    await db.collection('bookings').doc(BOOKING_EXISTING).set(booking(BOOKING_EXISTING, 'some-other-customer', 'pending'));

    await expect(db.runTransaction((t) => assertNoActiveBooking(t, db, CUSTOMER))).resolves.toBeUndefined();
  });

  it('the blocking status set matches the canonical exported constant (no drift)', () => {
    expect(ACTIVE_BOOKING_STATUSES).toEqual(['pending', 'accepted', 'in_progress']);
  });

  // --------------------------------------------------------------------------
  // Concurrency: two near-simultaneous booking-creation transactions for the
  // SAME customer must never both succeed. Mirrors slot-ownership-race.test.ts's
  // Promise.allSettled pattern for acquireSlotLock.
  // --------------------------------------------------------------------------
  it('two concurrent booking-creation attempts for the same customer: exactly one succeeds', async () => {
    // Firestore's transaction retry (contention on the shared query read) can take
    // longer than vitest's 5s default against the emulator's optimistic-concurrency
    // backoff -- mirrors the allowance the analogous slot-ownership-race test needs.
    const bookingARef = db.collection('bookings').doc(BOOKING_NEW_A);
    const bookingBRef = db.collection('bookings').doc(BOOKING_NEW_B);

    async function attempt(bookingRef: FirebaseFirestore.DocumentReference) {
      return db.runTransaction(async (t) => {
        await assertNoActiveBooking(t, db, CUSTOMER);
        t.set(bookingRef, booking(bookingRef.id, CUSTOMER, 'pending'));
      });
    }

    const results = await Promise.allSettled([attempt(bookingARef), attempt(bookingBRef)]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(CustomerHasActiveBookingError);

    const [afterA, afterB] = await Promise.all([bookingARef.get(), bookingBRef.get()]);
    const created = [afterA, afterB].filter((s) => s.exists);
    expect(created).toHaveLength(1);
  }, 15000);
});
