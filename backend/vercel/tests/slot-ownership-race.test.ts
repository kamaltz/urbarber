/**
 * P0-1 remediation tests (FINAL_THESIS_READINESS_AUDIT.md CRITICAL finding):
 * slot-lock acquisition in api/payments.ts (acquireSlotLock, src/bookings/slot-lock.ts)
 * and the ownership guard in reconcilePaymentTransaction (src/payments/reconcile-transaction.ts)
 * must together guarantee that exactly one booking can ever hold a final (paid) claim
 * on a given barberId+date+startTime slot -- no matter how requests interleave.
 *
 * Uses the real Firestore emulator (not mocks), mirroring the convention in
 * reconcile-transaction-atomicity.test.ts.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { acquireSlotLock, getSlotLockId, SlotNotAvailableError } from '../src/bookings/slot-lock.js';
import { db } from '../src/lib/firebase-admin.js';
import { reconcilePaymentTransaction } from '../src/payments/reconcile-transaction.js';
import { reconcileWebhookPayment } from '../src/payments/webhook-reconciliation.js';

const BARBER_ID = 'barber-p0-1';
const DATE = '2026-09-20';
const START_TIME = '10:00';
const SLOT_LOCK_ID = getSlotLockId(BARBER_ID, DATE, START_TIME);
const SLOT_LOCK_REF = db.collection('slotLocks').doc(SLOT_LOCK_ID);

const BOOKING_A = 'booking-p0-1-a';
const BOOKING_B = 'booking-p0-1-b';
const CUSTOMER_A = 'cust-p0-1-a';
const CUSTOMER_B = 'cust-p0-1-b';

function baseBooking(bookingId: string, customerId: string, overrides: Record<string, any> = {}) {
  return {
    id: bookingId,
    customerId,
    barberId: BARBER_ID,
    serviceId: 'svc-p0-1',
    date: DATE,
    startTime: START_TIME,
    price: 30000,
    status: 'pending',
    ...overrides,
  };
}

function basePayment(bookingId: string, customerId: string, overrides: Record<string, any> = {}) {
  return {
    bookingId,
    customerId,
    orderId: `URB-${bookingId}`,
    amount: 30000,
    grossAmount: 30000,
    currency: 'IDR',
    method: 'midtrans_sandbox',
    status: 'initiated',
    ...overrides,
  };
}

async function cleanup() {
  await Promise.all([
    db.collection('bookings').doc(BOOKING_A).delete(),
    db.collection('bookings').doc(BOOKING_B).delete(),
    db.collection('payments').doc(BOOKING_A).delete(),
    db.collection('payments').doc(BOOKING_B).delete(),
    SLOT_LOCK_REF.delete(),
  ]);
}

async function readAll() {
  const [a, b, pa, pb, lock] = await Promise.all([
    db.collection('bookings').doc(BOOKING_A).get(),
    db.collection('bookings').doc(BOOKING_B).get(),
    db.collection('payments').doc(BOOKING_A).get(),
    db.collection('payments').doc(BOOKING_B).get(),
    SLOT_LOCK_REF.get(),
  ]);
  return {
    bookingA: a.exists ? a.data() : null,
    bookingB: b.exists ? b.data() : null,
    paymentA: pa.exists ? pa.data() : null,
    paymentB: pb.exists ? pb.data() : null,
    slotLock: lock.exists ? lock.data() : null,
  };
}

describe('P0-1: slot ownership race condition (acquireSlotLock + reconcilePaymentTransaction)', () => {
  beforeEach(cleanup);

  // --------------------------------------------------------------------------
  // Test A: concurrent create-payment for the same slot -- exactly one wins
  // --------------------------------------------------------------------------
  it('A. two customers racing to create a booking for the identical slot: exactly one succeeds, the other gets SlotNotAvailableError', async () => {
    const bookingARef = db.collection('bookings').doc(BOOKING_A);
    const bookingBRef = db.collection('bookings').doc(BOOKING_B);

    async function attempt(bookingRef: FirebaseFirestore.DocumentReference, customerId: string) {
      return db.runTransaction(async (t) => {
        await acquireSlotLock(t, SLOT_LOCK_REF, { barberId: BARBER_ID, date: DATE, startTime: START_TIME, customerId });
        t.set(bookingRef, baseBooking(bookingRef.id, customerId));
      });
    }

    const results = await Promise.allSettled([attempt(bookingARef, CUSTOMER_A), attempt(bookingBRef, CUSTOMER_B)]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(SlotNotAvailableError);

    const after = await readAll();
    // Exactly one of the two bookings was actually written -- the transaction that
    // threw inside acquireSlotLock never reached its t.set(bookingRef, ...) call.
    const bookingsCreated = [after.bookingA, after.bookingB].filter(Boolean);
    expect(bookingsCreated).toHaveLength(1);
    expect(after.slotLock).not.toBeNull();
    // Whichever customer's booking exists, the lock must belong to that same customer.
    const winnerCustomerId = after.bookingA ? CUSTOMER_A : CUSTOMER_B;
    expect(after.slotLock?.customerId).toBe(winnerCustomerId);
  });

  // --------------------------------------------------------------------------
  // Test B: a finalized (paid) lock can never be stolen by a new booking attempt
  // --------------------------------------------------------------------------
  it('B. a finalized slot lock cannot be reassigned by a new booking-creation attempt, even from an unrelated customer', async () => {
    await SLOT_LOCK_REF.set({
      barberId: BARBER_ID,
      date: DATE,
      startTime: START_TIME,
      customerId: CUSTOMER_A,
      status: 'finalized',
      bookingId: BOOKING_A,
      finalizedAt: new Date().toISOString(),
    });

    const bookingBRef = db.collection('bookings').doc(BOOKING_B);

    await expect(
      db.runTransaction(async (t) => {
        await acquireSlotLock(t, SLOT_LOCK_REF, { barberId: BARBER_ID, date: DATE, startTime: START_TIME, customerId: CUSTOMER_B });
        t.set(bookingBRef, baseBooking(BOOKING_B, CUSTOMER_B));
      })
    ).rejects.toBeInstanceOf(SlotNotAvailableError);

    const after = await readAll();
    expect(after.bookingB).toBeNull(); // booking write never committed
    expect(after.slotLock?.bookingId).toBe(BOOKING_A); // lock untouched
    expect(after.slotLock?.status).toBe('finalized');
  });

  // --------------------------------------------------------------------------
  // Test E: an EXPIRED temporary hold may be reclaimed by a different customer
  // --------------------------------------------------------------------------
  it('E. an expired (non-finalized) temporary hold can be reclaimed by a different customer', async () => {
    await SLOT_LOCK_REF.set({
      barberId: BARBER_ID,
      date: DATE,
      startTime: START_TIME,
      customerId: CUSTOMER_A,
      createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // expired 5 min ago
    });

    const bookingBRef = db.collection('bookings').doc(BOOKING_B);

    await db.runTransaction(async (t) => {
      await acquireSlotLock(t, SLOT_LOCK_REF, { barberId: BARBER_ID, date: DATE, startTime: START_TIME, customerId: CUSTOMER_B });
      t.set(bookingBRef, baseBooking(BOOKING_B, CUSTOMER_B));
    });

    const after = await readAll();
    expect(after.bookingB).not.toBeNull();
    expect(after.slotLock?.customerId).toBe(CUSTOMER_B);
  });

  // A LIVE (non-expired) hold, by contrast, must still block a different customer --
  // regression guard so the expiry fix above doesn't accidentally weaken the base case.
  it('E2. a still-live (non-expired) temporary hold blocks a different customer', async () => {
    await SLOT_LOCK_REF.set({
      barberId: BARBER_ID,
      date: DATE,
      startTime: START_TIME,
      customerId: CUSTOMER_A,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // still 10 min left
    });

    await expect(
      db.runTransaction(async (t) => {
        await acquireSlotLock(t, SLOT_LOCK_REF, { barberId: BARBER_ID, date: DATE, startTime: START_TIME, customerId: CUSTOMER_B });
      })
    ).rejects.toBeInstanceOf(SlotNotAvailableError);
  });

  // --------------------------------------------------------------------------
  // Test D: reconciliation for a second, different booking on an already-finalized
  // slot must fail safe -- never steal the lock, never lose the payment record.
  // --------------------------------------------------------------------------
  it('D. reconciling a different booking whose slot is already finalized fails safe: payment preserved, booking cancelled+refundRequired, lock untouched', async () => {
    // Booking A already finalized this slot (the legitimate, first-to-pay booking).
    await db.collection('bookings').doc(BOOKING_A).set(baseBooking(BOOKING_A, CUSTOMER_A, { paymentStatus: 'paid', paidAt: new Date().toISOString() }));
    await db.collection('payments').doc(BOOKING_A).set(basePayment(BOOKING_A, CUSTOMER_A, { status: 'paid', paidAt: new Date().toISOString() }));
    const finalizedAt = new Date().toISOString();
    await SLOT_LOCK_REF.set({
      barberId: BARBER_ID,
      date: DATE,
      startTime: START_TIME,
      customerId: CUSTOMER_A,
      status: 'finalized',
      bookingId: BOOKING_A,
      finalizedAt,
    });

    // Booking B: a second booking that (pre-fix) could have been created for the
    // identical slot via the old race; its payment now also comes back paid.
    await db.collection('bookings').doc(BOOKING_B).set(baseBooking(BOOKING_B, CUSTOMER_B));
    await db.collection('payments').doc(BOOKING_B).set(basePayment(BOOKING_B, CUSTOMER_B));

    const { mappedStatus } = await reconcilePaymentTransaction(BOOKING_B, {
      transaction_status: 'capture',
      fraud_status: 'accept',
      transaction_id: 'txn-p0-1-conflict',
      payment_type: 'credit_card',
    });

    expect(mappedStatus).toBe('paid');

    const after = await readAll();
    // Payment audit trail preserved -- money was genuinely received.
    expect(after.paymentB?.status).toBe('paid');
    // Booking B does NOT get to keep the slot: fails safe as cancelled+refundRequired,
    // mirroring the existing paid-then-rejected/cancelled pattern.
    expect(after.bookingB?.status).toBe('cancelled');
    expect(after.bookingB?.refundRequired).toBe(true);
    expect(after.bookingB?.paymentStatus).toBe('paid');
    // The slot lock is never reassigned -- booking A keeps exclusive ownership.
    expect(after.slotLock?.bookingId).toBe(BOOKING_A);
    expect(after.slotLock?.status).toBe('finalized');
    expect(after.slotLock?.finalizedAt).toBe(finalizedAt);
  });

  // --------------------------------------------------------------------------
  // Test C: repeated/duplicate reconciliation for the losing booking is idempotent
  // --------------------------------------------------------------------------
  it('C. duplicate reconciliation for the same losing booking is idempotent -- never re-attempts stealing the lock', async () => {
    await db.collection('bookings').doc(BOOKING_A).set(baseBooking(BOOKING_A, CUSTOMER_A, { paymentStatus: 'paid', paidAt: new Date().toISOString() }));
    await db.collection('payments').doc(BOOKING_A).set(basePayment(BOOKING_A, CUSTOMER_A, { status: 'paid' }));
    await SLOT_LOCK_REF.set({
      barberId: BARBER_ID,
      date: DATE,
      startTime: START_TIME,
      customerId: CUSTOMER_A,
      status: 'finalized',
      bookingId: BOOKING_A,
      finalizedAt: new Date().toISOString(),
    });
    await db.collection('bookings').doc(BOOKING_B).set(baseBooking(BOOKING_B, CUSTOMER_B));
    await db.collection('payments').doc(BOOKING_B).set(basePayment(BOOKING_B, CUSTOMER_B));

    const midtransStatus = { transaction_status: 'capture', fraud_status: 'accept', transaction_id: 'txn-p0-1-dup', payment_type: 'credit_card' };

    await reconcilePaymentTransaction(BOOKING_B, midtransStatus);
    const first = await readAll();

    // Simulate a duplicate/retried webhook or sync call for the same losing booking.
    await reconcilePaymentTransaction(BOOKING_B, midtransStatus);
    await reconcilePaymentTransaction(BOOKING_B, midtransStatus);
    const third = await readAll();

    expect(third.bookingB?.status).toBe('cancelled');
    expect(third.bookingB?.refundRequired).toBe(true);
    expect(third.slotLock?.bookingId).toBe(BOOKING_A); // still never stolen
    expect(third.slotLock?.finalizedAt).toBe(first.slotLock?.finalizedAt); // lock never rewritten
  });

  // --------------------------------------------------------------------------
  // Test F: a delayed webhook for the losing booking (arriving after A already
  // finalized) must not create duplicate ownership -- same guarantee via the
  // webhook entry point, not just sync.
  // --------------------------------------------------------------------------
  it('F. a delayed webhook notification for the losing booking does not create duplicate slot ownership', async () => {
    await db.collection('bookings').doc(BOOKING_A).set(baseBooking(BOOKING_A, CUSTOMER_A, { paymentStatus: 'paid', paidAt: new Date().toISOString() }));
    await db.collection('payments').doc(BOOKING_A).set(basePayment(BOOKING_A, CUSTOMER_A, { status: 'paid' }));
    await SLOT_LOCK_REF.set({
      barberId: BARBER_ID,
      date: DATE,
      startTime: START_TIME,
      customerId: CUSTOMER_A,
      status: 'finalized',
      bookingId: BOOKING_A,
      finalizedAt: new Date().toISOString(),
    });
    await db.collection('bookings').doc(BOOKING_B).set(baseBooking(BOOKING_B, CUSTOMER_B));
    await db.collection('payments').doc(BOOKING_B).set(basePayment(BOOKING_B, CUSTOMER_B));

    const { mappedStatus, applied } = await reconcileWebhookPayment(
      BOOKING_B,
      {},
      {},
      { transaction_status: 'capture', fraud_status: 'accept' },
      'credit_card',
      'txn-p0-1-delayed-webhook'
    );

    expect(mappedStatus).toBe('paid');
    expect(applied).toBe(true);

    const after = await readAll();
    expect(after.bookingB?.status).toBe('cancelled');
    expect(after.bookingB?.refundRequired).toBe(true);
    expect(after.slotLock?.bookingId).toBe(BOOKING_A);

    const slotLocksForBarber = await db.collection('slotLocks').where('barberId', '==', BARBER_ID).where('date', '==', DATE).get();
    expect(slotLocksForBarber.size).toBe(1); // exactly one lock document for this slot, no duplicate
  });
});
