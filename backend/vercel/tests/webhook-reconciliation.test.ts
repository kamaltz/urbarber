/**
 * Batch 09F-1: Webhook Payment Reconciliation Regression Tests
 *
 * Covers P1_WEBHOOK_RECOVERY_ASYMMETRY: the pre-fix webhook only finalized the slot /
 * stamped paidAt when `!paymentData.paidAt`, so it could never repair a state where
 * paidAt already exists but the booking was incorrectly cancelled and/or the
 * finalized slot lock is missing. reconcileWebhookPayment now shares
 * decideReconciliation() (src/payments/reconciliation-decision.ts) with
 * reconcilePaymentSync (src/payments/sync-reconciliation.ts, Batch 09E-P0) so both
 * entry points apply the exact same evidence-gated recovery rule.
 *
 * Exercises the actual production functions (reconcileWebhookPayment,
 * isAlreadyReconciled) against the Firestore emulator directly -- no HTTP layer or
 * Midtrans client involved, matching the convention in
 * payment-sync-reconciliation.test.ts.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { getSlotLockId } from '../src/bookings/slot-lock.js';
import { db } from '../src/lib/firebase-admin.js';
import { isAlreadyReconciled, reconcileWebhookPayment } from '../src/payments/webhook-reconciliation.js';
import { reconcilePaymentSync } from '../src/payments/sync-reconciliation.js';

const BARBER_ID = 'barber-09f-1';
const BOOKING_ID = 'booking-09f-1';
const CUSTOMER_ID = 'cust-09f-1';
const DATE = '2026-09-05';
const START_TIME = '11:00';
const SLOT_LOCK_ID = getSlotLockId(BARBER_ID, DATE, START_TIME);

function baseBooking(overrides: Record<string, any> = {}) {
  return {
    id: BOOKING_ID,
    customerId: CUSTOMER_ID,
    barberId: BARBER_ID,
    serviceId: 'svc-09f-1',
    date: DATE,
    startTime: START_TIME,
    price: 20000,
    status: 'pending',
    ...overrides,
  };
}

function basePayment(overrides: Record<string, any> = {}) {
  return {
    bookingId: BOOKING_ID,
    customerId: CUSTOMER_ID,
    orderId: `URB-${BOOKING_ID}`,
    amount: 20000,
    grossAmount: 20000,
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

describe('reconcileWebhookPayment -- shared reconciliation (Batch 09F-1)', () => {
  beforeEach(async () => {
    await db.collection('bookings').doc(BOOKING_ID).delete();
    await db.collection('payments').doc(BOOKING_ID).delete();
    await db.collection('slotLocks').doc(SLOT_LOCK_ID).delete();
  });

  it('A. webhook capture+accept on a fresh initiated payment -> paid, slot finalized', async () => {
    const booking = baseBooking();
    const payment = basePayment();
    await seedFirestore({ booking, payment, slotLock: { barberId: BARBER_ID, date: DATE, startTime: START_TIME, customerId: CUSTOMER_ID } });

    const { mappedStatus } = await reconcileWebhookPayment(
      BOOKING_ID,
      booking,
      payment,
      { transaction_status: 'capture', fraud_status: 'accept' },
      'credit_card',
      'txn-a'
    );

    expect(mappedStatus).toBe('paid');
    const { booking: after, payment: pAfter, slotLock } = await readAll();
    expect(pAfter?.status).toBe('paid');
    expect(pAfter?.paidAt).toBeTruthy();
    expect(after?.paymentStatus).toBe('paid');
    expect(after?.status).toBe('pending');
    expect(slotLock?.status).toBe('finalized');
    expect(slotLock?.bookingId).toBe(BOOKING_ID);
  });

  it('C. webhook repeated paid notification is idempotent (isAlreadyReconciled short-circuits, no drift on re-apply)', async () => {
    const booking = baseBooking();
    const payment = basePayment();
    await seedFirestore({ booking, payment, slotLock: { barberId: BARBER_ID, date: DATE, startTime: START_TIME, customerId: CUSTOMER_ID } });

    const status = { transaction_status: 'capture', fraud_status: 'accept' };
    await reconcileWebhookPayment(BOOKING_ID, booking, payment, status, 'credit_card', 'txn-c');

    const first = await readAll();
    const alreadyReconciled = await isAlreadyReconciled(BOOKING_ID, first.booking!, first.payment!, status);
    expect(alreadyReconciled).toBe(true);

    // Simulate a second delivery of the same notification anyway -- must remain
    // byte-for-byte equivalent (paidAt does not move, no duplicate slot).
    await reconcileWebhookPayment(BOOKING_ID, first.booking!, first.payment!, status, 'credit_card', 'txn-c');
    const second = await readAll();
    expect(second.payment?.paidAt).toBe(first.payment?.paidAt);
    expect(second.slotLock?.finalizedAt).toBe(first.slotLock?.finalizedAt);
  });

  it('E. webhook and sync converge to the same state from the same starting point', async () => {
    const boardingBooking = baseBooking();
    const boardingPayment = basePayment();

    // Path 1: webhook only.
    await seedFirestore({ booking: boardingBooking, payment: boardingPayment, slotLock: null });
    await reconcileWebhookPayment(
      BOOKING_ID,
      boardingBooking,
      boardingPayment,
      { transaction_status: 'capture', fraud_status: 'accept' },
      'credit_card',
      'txn-e'
    );
    const viaWebhook = await readAll();

    // Path 2: sync only, from an identical starting point.
    await seedFirestore({ booking: boardingBooking, payment: boardingPayment, slotLock: null });
    await reconcilePaymentSync(BOOKING_ID, boardingBooking, boardingPayment, {
      transaction_status: 'capture',
      fraud_status: 'accept',
      transaction_id: 'txn-e',
      payment_type: 'credit_card',
    });
    const viaSync = await readAll();

    expect(viaWebhook.payment?.status).toBe(viaSync.payment?.status);
    expect(viaWebhook.booking?.paymentStatus).toBe(viaSync.booking?.paymentStatus);
    expect(viaWebhook.booking?.status).toBe(viaSync.booking?.status);
    expect(viaWebhook.slotLock?.status).toBe(viaSync.slotLock?.status);
    expect(viaWebhook.slotLock?.bookingId).toBe(viaSync.slotLock?.bookingId);
  });

  it('F. webhook repairs a previously-corrupted recoverable state (paidAt set, booking wrongly cancelled, slot missing)', async () => {
    const now = new Date().toISOString();
    // The exact P1_WEBHOOK_RECOVERY_ASYMMETRY corruption: paidAt already exists (so
    // the pre-fix `!paymentData.paidAt` gate would skip finalization forever), but
    // the booking was wrongly cancelled with none of the legitimate-cancellation
    // markers, and the slot lock is gone.
    const booking = baseBooking({ paymentStatus: 'paid', status: 'cancelled', paidAt: now });
    const payment = basePayment({ status: 'paid', paidAt: now, transactionStatus: 'capture', fraudStatus: 'accept' });
    await seedFirestore({ booking, payment, slotLock: null });

    const alreadyReconciled = await isAlreadyReconciled(BOOKING_ID, booking, payment, {
      transaction_status: 'capture',
      fraud_status: 'accept',
    });
    expect(alreadyReconciled).toBe(false); // must NOT be treated as already-processed

    const { mappedStatus } = await reconcileWebhookPayment(
      BOOKING_ID,
      booking,
      payment,
      { transaction_status: 'capture', fraud_status: 'accept' },
      'credit_card',
      'txn-f'
    );

    expect(mappedStatus).toBe('paid');
    const { booking: after, payment: pAfter, slotLock } = await readAll();
    expect(pAfter?.status).toBe('paid');
    expect(after?.paymentStatus).toBe('paid');
    expect(after?.status).toBe('pending'); // repaired
    expect(slotLock?.status).toBe('finalized');
    expect(slotLock?.bookingId).toBe(BOOKING_ID);
  });

  it('G. does NOT resurrect a legitimately cancelled paid booking (webhook)', async () => {
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

    await reconcileWebhookPayment(
      BOOKING_ID,
      booking,
      payment,
      { transaction_status: 'capture', fraud_status: 'accept' },
      'credit_card',
      'txn-g'
    );

    const { booking: after, slotLock } = await readAll();
    expect(after?.status).toBe('cancelled');
    expect(after?.refundRequired).toBe(true);
    expect(slotLock).toBeNull();
  });

  it('H. does NOT resurrect (or re-finalize a slot for) a legitimately rejected paid booking (webhook)', async () => {
    const now = new Date().toISOString();
    // Mirrors api/app.ts's barber-reject action: status 'rejected', refundRequired
    // when paid, slot lock already released -- no cancelledAt/cancellationReason
    // (those only apply to the cancel path).
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

    await reconcileWebhookPayment(
      BOOKING_ID,
      booking,
      payment,
      { transaction_status: 'capture', fraud_status: 'accept' },
      'credit_card',
      'txn-h'
    );

    const { booking: after, slotLock } = await readAll();
    expect(after?.status).toBe('rejected');
    expect(after?.refundRequired).toBe(true);
    expect(slotLock).toBeNull(); // not re-finalized
  });

  it('I. capture+challenge remains non-destructive (webhook)', async () => {
    const booking = baseBooking();
    const payment = basePayment();
    await seedFirestore({ booking, payment, slotLock: { barberId: BARBER_ID, date: DATE, startTime: START_TIME, customerId: CUSTOMER_ID } });

    const { mappedStatus } = await reconcileWebhookPayment(
      BOOKING_ID,
      booking,
      payment,
      { transaction_status: 'capture', fraud_status: 'challenge' },
      'credit_card',
      'txn-i'
    );

    expect(mappedStatus).toBe('pending');
    const { booking: after, payment: pAfter, slotLock } = await readAll();
    expect(pAfter?.status).toBe('pending');
    expect(after?.status).toBe('pending');
    expect(slotLock).not.toBeNull(); // untouched, not released
  });

  it('J. capture+missing fraud_status on an already-paid finalized booking is not destructively downgraded (webhook)', async () => {
    const now = new Date().toISOString();
    const booking = baseBooking({ paymentStatus: 'paid', status: 'pending', paidAt: now });
    const payment = basePayment({ status: 'paid', paidAt: now, transactionStatus: 'capture', fraudStatus: 'accept' });
    const slotLock = { barberId: BARBER_ID, date: DATE, startTime: START_TIME, customerId: CUSTOMER_ID, status: 'finalized', bookingId: BOOKING_ID, finalizedAt: now };
    await seedFirestore({ booking, payment, slotLock });

    const { mappedStatus } = await reconcileWebhookPayment(
      BOOKING_ID,
      booking,
      payment,
      { transaction_status: 'capture', fraud_status: null },
      'credit_card',
      'txn-j'
    );

    expect(mappedStatus).not.toBe('failed');
    const { booking: after, payment: pAfter, slotLock: sAfter } = await readAll();
    expect(pAfter?.status).not.toBe('failed');
    expect(after?.status).not.toBe('cancelled');
    expect(after?.paymentStatus).toBe('paid');
    expect(sAfter?.status).toBe('finalized');
  });

  it('N. failed/expired/cancelled provider states preserve canonical release behavior (webhook)', async () => {
    const booking = baseBooking();
    const payment = basePayment();
    await seedFirestore({ booking, payment, slotLock: { barberId: BARBER_ID, date: DATE, startTime: START_TIME, customerId: CUSTOMER_ID } });

    const { mappedStatus } = await reconcileWebhookPayment(
      BOOKING_ID,
      booking,
      payment,
      { transaction_status: 'expire' },
      null,
      'txn-n'
    );

    expect(mappedStatus).toBe('expired');
    const { booking: after, payment: pAfter, slotLock } = await readAll();
    expect(pAfter?.status).toBe('expired');
    expect(after?.status).toBe('cancelled');
    expect(slotLock).toBeNull();
  });
});
