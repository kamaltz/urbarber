/**
 * Batch 09F-1B: Transactional Reconciliation Atomicity Tests
 *
 * Proves the property the pre-09F-1B sequential-write version of
 * reconcilePaymentSync (booking -> slotLock -> booking again -> payment, as up to
 * four separate Firestore calls) could NOT guarantee: that payments/{bookingId},
 * bookings/{bookingId}, and slotLocks/{slotId} are never observed in a
 * partially-updated state, and that concurrent webhook+sync calls for the same order
 * converge to one consistent result instead of racing.
 *
 * Uses the real Firestore emulator's transaction semantics (not mocks) -- an error
 * thrown inside a db.runTransaction callback, even after queuing writes with
 * t.update/t.set/t.delete, discards the ENTIRE queued write set. Sections A-C below
 * inject a failure at different points in the same write sequence
 * reconcilePaymentTransaction uses (payment -> booking -> slot) to prove none of
 * them can partially commit.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { getSlotLockId } from '../src/bookings/slot-lock.js';
import { db } from '../src/lib/firebase-admin.js';
import { reconcilePaymentTransaction } from '../src/payments/reconcile-transaction.js';
import { reconcilePaymentSync } from '../src/payments/sync-reconciliation.js';
import { reconcileWebhookPayment } from '../src/payments/webhook-reconciliation.js';

const BARBER_ID = 'barber-09f-1b';
const BOOKING_ID = 'booking-09f-1b';
const CUSTOMER_ID = 'cust-09f-1b';
const DATE = '2026-09-10';
const START_TIME = '13:00';
const SLOT_LOCK_ID = getSlotLockId(BARBER_ID, DATE, START_TIME);

function baseBooking(overrides: Record<string, any> = {}) {
  return {
    id: BOOKING_ID,
    customerId: CUSTOMER_ID,
    barberId: BARBER_ID,
    serviceId: 'svc-09f-1b',
    date: DATE,
    startTime: START_TIME,
    price: 25000,
    status: 'pending',
    ...overrides,
  };
}

function basePayment(overrides: Record<string, any> = {}) {
  return {
    bookingId: BOOKING_ID,
    customerId: CUSTOMER_ID,
    orderId: `URB-${BOOKING_ID}`,
    amount: 25000,
    grossAmount: 25000,
    currency: 'IDR',
    method: 'midtrans_sandbox',
    status: 'initiated',
    ...overrides,
  };
}

async function seedFirestore(opts: {
  booking: Record<string, any>;
  payment: Record<string, any>;
  slotLock: Record<string, any> | null;
}) {
  await db.collection('bookings').doc(BOOKING_ID).set(opts.booking);
  await db.collection('payments').doc(BOOKING_ID).set(opts.payment);
  if (opts.slotLock === null) {
    await db.collection('slotLocks').doc(SLOT_LOCK_ID).delete();
  } else {
    await db.collection('slotLocks').doc(SLOT_LOCK_ID).set(opts.slotLock);
  }
}

async function readAll() {
  const [b, p, s] = await Promise.all([
    db.collection('bookings').doc(BOOKING_ID).get(),
    db.collection('payments').doc(BOOKING_ID).get(),
    db.collection('slotLocks').doc(SLOT_LOCK_ID).get(),
  ]);
  return { booking: b.data(), payment: p.data(), slotLock: s.exists ? s.data() : null };
}

describe('reconcilePaymentTransaction -- atomicity (Batch 09F-1B)', () => {
  beforeEach(async () => {
    await db.collection('bookings').doc(BOOKING_ID).delete();
    await db.collection('payments').doc(BOOKING_ID).delete();
    await db.collection('slotLocks').doc(SLOT_LOCK_ID).delete();
  });

  // --------------------------------------------------------------------------
  // Section: paid finalization / recovery / release atomicity (single-call)
  // --------------------------------------------------------------------------

  it('sync paid atomic finalization: payment, booking.paymentStatus, and slotLock all commit together in one call', async () => {
    const booking = baseBooking();
    const payment = basePayment();
    await seedFirestore({ booking, payment, slotLock: null });

    const { mappedStatus } = await reconcilePaymentSync(BOOKING_ID, booking, payment, {
      transaction_status: 'capture',
      fraud_status: 'accept',
      transaction_id: 'txn-atomic-a',
      payment_type: 'credit_card',
    });

    expect(mappedStatus).toBe('paid');
    const after = await readAll();
    expect(after.payment?.status).toBe('paid');
    expect(after.booking?.paymentStatus).toBe('paid');
    expect(after.slotLock?.status).toBe('finalized');
    expect(after.slotLock?.bookingId).toBe(BOOKING_ID);
  });

  it('sync paid recovery atomicity: corrupted state (paidAt set, wrongly cancelled, slot missing) repairs all three docs in one commit', async () => {
    const now = new Date().toISOString();
    const booking = baseBooking({ paymentStatus: 'paid', status: 'cancelled', paidAt: now });
    const payment = basePayment({ status: 'failed', paidAt: now, transactionStatus: 'capture', fraudStatus: 'accept' });
    await seedFirestore({ booking, payment, slotLock: null });

    const { mappedStatus } = await reconcilePaymentSync(BOOKING_ID, booking, payment, {
      transaction_status: 'capture',
      fraud_status: 'accept',
      transaction_id: 'txn-atomic-recovery',
      payment_type: 'credit_card',
    });

    expect(mappedStatus).toBe('paid');
    const after = await readAll();
    expect(after.payment?.status).toBe('paid');
    expect(after.booking?.paymentStatus).toBe('paid');
    expect(after.booking?.status).toBe('pending');
    expect(after.slotLock?.status).toBe('finalized');
  });

  it('sync failed atomic release: payment=failed, booking=cancelled, slotLock deleted all commit together', async () => {
    const booking = baseBooking();
    const payment = basePayment();
    await seedFirestore({ booking, payment, slotLock: { barberId: BARBER_ID, date: DATE, startTime: START_TIME, customerId: CUSTOMER_ID } });

    const { mappedStatus } = await reconcilePaymentSync(BOOKING_ID, booking, payment, {
      transaction_status: 'capture',
      fraud_status: 'deny',
      transaction_id: 'txn-atomic-release',
      payment_type: 'credit_card',
    });

    expect(mappedStatus).toBe('failed');
    const after = await readAll();
    expect(after.payment?.status).toBe('failed');
    expect(after.booking?.status).toBe('cancelled');
    expect(after.slotLock).toBeNull();
  });

  // --------------------------------------------------------------------------
  // Section: failure injection -- proves no partial commit is possible
  // --------------------------------------------------------------------------

  it('A. failure-injection: error injected after payment write is queued discards the ENTIRE transaction (booking/slot untouched)', async () => {
    const booking = baseBooking();
    const payment = basePayment();
    await seedFirestore({ booking, payment, slotLock: { barberId: BARBER_ID, date: DATE, startTime: START_TIME, customerId: CUSTOMER_ID } });
    const before = await readAll();

    const paymentRef = db.collection('payments').doc(BOOKING_ID);
    const bookingRef = db.collection('bookings').doc(BOOKING_ID);
    const slotLockRef = db.collection('slotLocks').doc(SLOT_LOCK_ID);

    await expect(
      db.runTransaction(async (t) => {
        await Promise.all([t.get(paymentRef), t.get(bookingRef), t.get(slotLockRef)]);
        // Mirrors reconcilePaymentTransaction's write order: payment write queued
        // first, then simulate an unexpected failure BEFORE the booking write is
        // queued (e.g. an exception in the booking-update code path).
        t.update(paymentRef, { status: 'paid', paidAt: 'INJECTED-SHOULD-NOT-PERSIST' });
        throw new Error('INJECTED_FAILURE_BEFORE_BOOKING_WRITE');
      })
    ).rejects.toThrow('INJECTED_FAILURE_BEFORE_BOOKING_WRITE');

    const after = await readAll();
    expect(after).toEqual(before); // nothing committed, including the already-queued payment write
  });

  it('B. failure-injection: error injected after booking write is queued discards the ENTIRE transaction (payment/slot untouched)', async () => {
    const booking = baseBooking();
    const payment = basePayment();
    await seedFirestore({ booking, payment, slotLock: null });
    const before = await readAll();

    const paymentRef = db.collection('payments').doc(BOOKING_ID);
    const bookingRef = db.collection('bookings').doc(BOOKING_ID);
    const slotLockRef = db.collection('slotLocks').doc(SLOT_LOCK_ID);

    await expect(
      db.runTransaction(async (t) => {
        await Promise.all([t.get(paymentRef), t.get(bookingRef), t.get(slotLockRef)]);
        t.update(paymentRef, { status: 'paid', paidAt: 'INJECTED-SHOULD-NOT-PERSIST' });
        t.update(bookingRef, { paymentStatus: 'paid', paidAt: 'INJECTED-SHOULD-NOT-PERSIST' });
        // Simulate failure BEFORE the slot lock finalize write is queued.
        throw new Error('INJECTED_FAILURE_BEFORE_SLOT_WRITE');
      })
    ).rejects.toThrow('INJECTED_FAILURE_BEFORE_SLOT_WRITE');

    const after = await readAll();
    expect(after).toEqual(before); // no partial paid/finalized state
  });

  it('C. failure-injection: error injected after slot deletion is queued discards the ENTIRE transaction (payment/booking destructive transition does not partially commit)', async () => {
    const booking = baseBooking();
    const payment = basePayment();
    await seedFirestore({ booking, payment, slotLock: { barberId: BARBER_ID, date: DATE, startTime: START_TIME, customerId: CUSTOMER_ID } });
    const before = await readAll();

    const paymentRef = db.collection('payments').doc(BOOKING_ID);
    const bookingRef = db.collection('bookings').doc(BOOKING_ID);
    const slotLockRef = db.collection('slotLocks').doc(SLOT_LOCK_ID);

    await expect(
      db.runTransaction(async (t) => {
        await Promise.all([t.get(paymentRef), t.get(bookingRef), t.get(slotLockRef)]);
        // Release-path order: slot deletion queued first.
        t.delete(slotLockRef);
        t.update(bookingRef, { status: 'cancelled' });
        // Simulate failure BEFORE the payment write is queued.
        throw new Error('INJECTED_FAILURE_BEFORE_PAYMENT_WRITE');
      })
    ).rejects.toThrow('INJECTED_FAILURE_BEFORE_PAYMENT_WRITE');

    const after = await readAll();
    expect(after).toEqual(before); // slot still exists, booking still pending, payment untouched
  });

  it('real reconcilePaymentTransaction commits payment+booking+slotLock together on success (positive control for A/B/C)', async () => {
    const booking = baseBooking();
    const payment = basePayment();
    await seedFirestore({ booking, payment, slotLock: null });

    await reconcilePaymentTransaction(BOOKING_ID, {
      transaction_status: 'capture',
      fraud_status: 'accept',
      transaction_id: 'txn-positive-control',
      payment_type: 'credit_card',
    });

    const after = await readAll();
    expect(after.payment?.status).toBe('paid');
    expect(after.booking?.paymentStatus).toBe('paid');
    expect(after.slotLock?.status).toBe('finalized');
  });

  // --------------------------------------------------------------------------
  // Section: webhook + sync concurrency and repeated-call idempotency
  // --------------------------------------------------------------------------

  it('webhook+sync concurrency convergence: simultaneous calls for the same capture+accept order converge to exactly one finalized slot, no duplicates', async () => {
    const booking = baseBooking();
    const payment = basePayment();
    await seedFirestore({ booking, payment, slotLock: { barberId: BARBER_ID, date: DATE, startTime: START_TIME, customerId: CUSTOMER_ID } });

    const midtransStatus = { transaction_status: 'capture', fraud_status: 'accept' };

    const [webhookResult, syncResult] = await Promise.all([
      reconcileWebhookPayment(BOOKING_ID, booking, payment, midtransStatus, 'credit_card', 'txn-concurrent'),
      reconcilePaymentSync(BOOKING_ID, booking, payment, { ...midtransStatus, transaction_id: 'txn-concurrent', payment_type: 'credit_card' }),
    ]);

    expect(webhookResult.mappedStatus).toBe('paid');
    expect(syncResult.mappedStatus).toBe('paid');

    const after = await readAll();
    expect(after.payment?.status).toBe('paid');
    expect(after.booking?.paymentStatus).toBe('paid');
    expect(after.booking?.status).toBe('pending'); // lifecycle status preserved, not resurrected/altered
    expect(after.slotLock?.status).toBe('finalized');
    expect(after.slotLock?.bookingId).toBe(BOOKING_ID);

    // Exactly one document of each kind -- no duplicate booking/slot created by the race.
    const [bookingsSnap, slotLocksSnap] = await Promise.all([
      db.collection('bookings').where('barberId', '==', BARBER_ID).where('date', '==', DATE).get(),
      db.collection('slotLocks').where('barberId', '==', BARBER_ID).where('date', '==', DATE).get(),
    ]);
    expect(bookingsSnap.size).toBe(1);
    expect(slotLocksSnap.size).toBe(1);
  });

  it('repeated sync idempotency: three sequential reconciliations of the same paid status leave the business state stable (no duplicate finalization, paidAt never moves)', async () => {
    const booking = baseBooking();
    const payment = basePayment();
    await seedFirestore({ booking, payment, slotLock: null });

    const midtransStatus = { transaction_status: 'capture', fraud_status: 'accept', transaction_id: 'txn-repeat', payment_type: 'credit_card' };

    // updatedAt/lastReconciledAt are expected to advance on every call (each is a
    // fresh reconciliation attempt) -- the invariant under test is that the
    // *business* state (status fields, paidAt, finalizedAt, slot ownership) never
    // drifts or re-finalizes on replay.
    function stable(snapshot: Awaited<ReturnType<typeof readAll>>) {
      return {
        paymentStatus: snapshot.payment?.status,
        paymentPaidAt: snapshot.payment?.paidAt,
        transactionId: snapshot.payment?.transactionId,
        bookingPaymentStatus: snapshot.booking?.paymentStatus,
        bookingStatus: snapshot.booking?.status,
        bookingPaidAt: snapshot.booking?.paidAt,
        slotLockStatus: snapshot.slotLock?.status,
        slotLockBookingId: snapshot.slotLock?.bookingId,
        slotLockFinalizedAt: snapshot.slotLock?.finalizedAt,
      };
    }

    await reconcilePaymentSync(BOOKING_ID, booking, payment, midtransStatus);
    const first = await readAll();

    await reconcilePaymentSync(BOOKING_ID, first.booking!, first.payment!, midtransStatus);
    const second = await readAll();

    await reconcilePaymentSync(BOOKING_ID, second.booking!, second.payment!, midtransStatus);
    const third = await readAll();

    expect(stable(second)).toEqual(stable(first));
    expect(stable(third)).toEqual(stable(second));
    expect(third.payment?.paidAt).toBe(first.payment?.paidAt); // paidAt never moves on replay
    expect(third.slotLock?.finalizedAt).toBe(first.slotLock?.finalizedAt); // slot never re-finalized
  });

  // --------------------------------------------------------------------------
  // Section: legitimate terminal states remain untouched under the atomic core
  // --------------------------------------------------------------------------

  it('legitimate cancelled paid booking remains cancelled after transactional reconciliation', async () => {
    const now = new Date().toISOString();
    const booking = baseBooking({
      paymentStatus: 'paid',
      status: 'cancelled',
      paidAt: now,
      cancelledAt: now,
      cancellationReason: 'Dibatalkan oleh pelanggan',
      refundRequired: true,
    });
    const payment = basePayment({ status: 'paid', paidAt: now, transactionStatus: 'capture', fraudStatus: 'accept' });
    await seedFirestore({ booking, payment, slotLock: null });

    await reconcilePaymentTransaction(BOOKING_ID, { transaction_status: 'capture', fraud_status: 'accept' });

    const after = await readAll();
    expect(after.booking?.status).toBe('cancelled');
    expect(after.booking?.refundRequired).toBe(true);
    expect(after.slotLock).toBeNull();
  });

  it('legitimate rejected paid booking remains rejected after transactional reconciliation', async () => {
    const now = new Date().toISOString();
    const booking = baseBooking({
      paymentStatus: 'paid',
      status: 'rejected',
      paidAt: now,
      respondedAt: now,
      rejectionReason: 'Jadwal penuh',
      refundRequired: true,
    });
    const payment = basePayment({ status: 'paid', paidAt: now, transactionStatus: 'capture', fraudStatus: 'accept' });
    await seedFirestore({ booking, payment, slotLock: null });

    await reconcilePaymentTransaction(BOOKING_ID, { transaction_status: 'capture', fraud_status: 'accept' });

    const after = await readAll();
    expect(after.booking?.status).toBe('rejected');
    expect(after.booking?.refundRequired).toBe(true);
    expect(after.slotLock).toBeNull();
  });
});
