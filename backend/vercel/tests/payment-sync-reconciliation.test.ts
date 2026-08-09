/**
 * Batch 09E-P0: Payment Sync Reconciliation Regression Tests
 *
 * Incident: a real Sandbox transaction reached Midtrans transaction_status=capture,
 * fraud_status=accept (genuinely paid) and was correctly finalized once by the
 * webhook. A later call to POST /api/payments/sync then destructively cancelled it
 * -- because the pre-fix handler called mapMidtransStatus(transaction_status)
 * without ever passing fraud_status, so 'capture' fell through to the mapper's
 * destructive default ('failed'), which triggered shouldReleaseSlot() and deleted
 * the finalized slot lock + marked the booking 'cancelled', while
 * booking.paymentStatus stayed 'paid' from the earlier correct webhook write --
 * producing the corrupted split state this test suite guards against.
 *
 * Exercises the actual production reconciliation function (reconcilePaymentSync,
 * the same logic POST /api/payments/sync delegates to) against the Firestore
 * emulator directly -- no HTTP layer or Midtrans client involved.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { getSlotLockId } from '../src/bookings/slot-lock.js';
import { db } from '../src/lib/firebase-admin.js';
import { reconcilePaymentSync } from '../src/payments/sync-reconciliation.js';

const BARBER_ID = 'barber-09e-p0';
const BOOKING_ID = 'booking-09e-p0';
const CUSTOMER_ID = 'cust-09e-p0';
const DATE = '2026-09-01';
const START_TIME = '10:00';
const SLOT_LOCK_ID = getSlotLockId(BARBER_ID, DATE, START_TIME);

function baseBooking(overrides: Record<string, any> = {}) {
  return {
    id: BOOKING_ID,
    customerId: CUSTOMER_ID,
    barberId: BARBER_ID,
    serviceId: 'svc-09e-p0',
    date: DATE,
    startTime: START_TIME,
    price: 15000,
    status: 'pending',
    ...overrides,
  };
}

function basePayment(overrides: Record<string, any> = {}) {
  return {
    bookingId: BOOKING_ID,
    customerId: CUSTOMER_ID,
    orderId: `URB-${BOOKING_ID}`,
    amount: 15000,
    grossAmount: 15000,
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

describe('reconcilePaymentSync -- fraud_status-aware reconciliation (Batch 09E-P0)', () => {
  beforeEach(async () => {
    await db.collection('bookings').doc(BOOKING_ID).delete();
    await db.collection('payments').doc(BOOKING_ID).delete();
    await db.collection('slotLocks').doc(SLOT_LOCK_ID).delete();
  });

  it('A. capture + accept on a fresh initiated payment -> paid, slot finalized', async () => {
    await seedFirestore({ booking: baseBooking(), payment: basePayment(), slotLock: null });

    const { mappedStatus } = await reconcilePaymentSync(
      BOOKING_ID,
      baseBooking(),
      basePayment(),
      { transaction_status: 'capture', fraud_status: 'accept', transaction_id: 'txn-a', payment_type: 'credit_card' }
    );

    expect(mappedStatus).toBe('paid');
    const { booking, payment, slotLock } = await readAll();
    expect(payment?.status).toBe('paid');
    expect(booking?.paymentStatus).toBe('paid');
    expect(booking?.status).toBe('pending');
    expect(slotLock?.status).toBe('finalized');
    expect(slotLock?.bookingId).toBe(BOOKING_ID);
  });

  it('B. capture + deny -> failed, slot released, booking cancelled (legitimate destructive path)', async () => {
    await seedFirestore({ booking: baseBooking(), payment: basePayment(), slotLock: { barberId: BARBER_ID, date: DATE, startTime: START_TIME, customerId: CUSTOMER_ID } });

    const { mappedStatus } = await reconcilePaymentSync(
      BOOKING_ID,
      baseBooking(),
      basePayment(),
      { transaction_status: 'capture', fraud_status: 'deny', transaction_id: 'txn-b', payment_type: 'credit_card' }
    );

    expect(mappedStatus).toBe('failed');
    const { booking, payment, slotLock } = await readAll();
    expect(payment?.status).toBe('failed');
    expect(booking?.status).toBe('cancelled');
    expect(slotLock).toBeNull();
  });

  it('C. capture + challenge -> pending, not finalized as paid, not destructively failed', async () => {
    const booking = baseBooking();
    await seedFirestore({ booking, payment: basePayment(), slotLock: { barberId: BARBER_ID, date: DATE, startTime: START_TIME, customerId: CUSTOMER_ID } });

    const { mappedStatus } = await reconcilePaymentSync(
      BOOKING_ID,
      booking,
      basePayment(),
      { transaction_status: 'capture', fraud_status: 'challenge', transaction_id: 'txn-c', payment_type: 'credit_card' }
    );

    expect(mappedStatus).toBe('pending');
    const { booking: after, payment, slotLock } = await readAll();
    expect(payment?.status).toBe('pending');
    expect(after?.paymentStatus).toBeUndefined();
    expect(after?.status).toBe('pending'); // untouched, not cancelled
    expect(slotLock).not.toBeNull(); // untouched, not released
  });

  it('D. capture + missing fraud_status on an ALREADY-PAID, finalized booking must NOT downgrade it to failed', async () => {
    const now = new Date().toISOString();
    const booking = baseBooking({ paymentStatus: 'paid', status: 'pending', paidAt: now });
    const payment = basePayment({ status: 'paid', paidAt: now, transactionStatus: 'capture', fraudStatus: 'accept' });
    const slotLock = { barberId: BARBER_ID, date: DATE, startTime: START_TIME, customerId: CUSTOMER_ID, status: 'finalized', bookingId: BOOKING_ID, finalizedAt: now };
    await seedFirestore({ booking, payment, slotLock });

    // Simulate an incomplete Get Status response (fraud_status omitted)
    const { mappedStatus } = await reconcilePaymentSync(
      BOOKING_ID,
      booking,
      payment,
      { transaction_status: 'capture', transaction_id: 'txn-d', payment_type: 'credit_card' }
    );

    expect(mappedStatus).not.toBe('failed');
    const { booking: after, payment: pAfter, slotLock: sAfter } = await readAll();
    expect(pAfter?.status).not.toBe('failed');
    expect(after?.status).not.toBe('cancelled');
    expect(after?.paymentStatus).toBe('paid');
    expect(sAfter).not.toBeNull();
    expect(sAfter?.status).toBe('finalized');
  });

  // The mandatory regression from the incident report: an already fully paid and
  // finalized booking, re-synced against a definitive capture+accept read, must come
  // out byte-for-byte equivalent -- no deletion, no duplicate resources, no drift.
  it('MANDATORY: paid + finalized booking re-synced with capture+accept remains fully unchanged', async () => {
    const now = new Date().toISOString();
    const booking = baseBooking({ paymentStatus: 'paid', status: 'pending', paidAt: now });
    const payment = basePayment({ status: 'paid', paidAt: now, transactionStatus: 'capture', fraudStatus: 'accept', transactionId: 'txn-existing' });
    const slotLock = { barberId: BARBER_ID, date: DATE, startTime: START_TIME, customerId: CUSTOMER_ID, status: 'finalized', bookingId: BOOKING_ID, finalizedAt: now };
    await seedFirestore({ booking, payment, slotLock });

    const before = await readAll();
    expect(before.payment?.status).toBe('paid');
    expect(before.booking?.paymentStatus).toBe('paid');
    expect(before.booking?.status).toBe('pending');
    expect(before.slotLock?.status).toBe('finalized');

    const { mappedStatus } = await reconcilePaymentSync(
      BOOKING_ID,
      booking,
      payment,
      { transaction_status: 'capture', fraud_status: 'accept', transaction_id: 'txn-existing', payment_type: 'credit_card' }
    );
    expect(mappedStatus).toBe('paid');

    const after = await readAll();
    expect(after.payment?.status).toBe('paid');
    expect(after.booking?.paymentStatus).toBe('paid');
    expect(after.booking?.status).toBe('pending');
    expect(after.slotLock?.status).toBe('finalized');
    expect(after.slotLock?.bookingId).toBe(BOOKING_ID);

    // Exactly one booking, one payment, one slot lock document -- no duplicates.
    const [bAll, pDoc, sDoc] = await Promise.all([
      db.collection('bookings').where('barberId', '==', BARBER_ID).where('date', '==', DATE).get(),
      db.collection('payments').doc(BOOKING_ID).get(),
      db.collection('slotLocks').doc(SLOT_LOCK_ID).get(),
    ]);
    expect(bAll.size).toBe(1);
    expect(pDoc.exists).toBe(true);
    expect(sDoc.exists).toBe(true);
  });

  // The exact corruption from the incident: paid, but wrongly marked cancelled by the
  // pre-fix bug (no cancelledAt/cancellationReason/refundRequired -- proving it wasn't
  // a real cancellation), with the slot lock deleted entirely. A fresh capture+accept
  // sync must recover it, without needing a manual Firestore edit.
  it('RECOVERY: sync-bug-corrupted (paid but wrongly cancelled, slot deleted) is safely restored by a fresh capture+accept sync', async () => {
    const now = new Date().toISOString();
    const booking = baseBooking({ paymentStatus: 'paid', status: 'cancelled', paidAt: now }); // no cancelledAt/cancellationReason/refundRequired
    const payment = basePayment({ status: 'failed', paidAt: now, transactionStatus: 'capture', fraudStatus: 'accept' });
    await seedFirestore({ booking, payment, slotLock: null }); // deleted by the bug

    const { mappedStatus } = await reconcilePaymentSync(
      BOOKING_ID,
      booking,
      payment,
      { transaction_status: 'capture', fraud_status: 'accept', transaction_id: 'txn-recovery', payment_type: 'credit_card' }
    );

    expect(mappedStatus).toBe('paid');
    const { booking: after, payment: pAfter, slotLock } = await readAll();
    expect(pAfter?.status).toBe('paid');
    expect(after?.paymentStatus).toBe('paid');
    expect(after?.status).toBe('pending');
    expect(slotLock?.status).toBe('finalized');
    expect(slotLock?.bookingId).toBe(BOOKING_ID);
  });

  // A GENUINE customer/admin cancellation of a paid booking (stamped by
  // handleCancelBooking with cancelledAt/cancellationReason/refundRequired) must
  // never be resurrected by a later sync call, even if Midtrans still reports the
  // underlying charge as captured+accepted.
  it('does NOT resurrect a legitimately cancelled paid booking (refund owed, not a sync bug)', async () => {
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
    await seedFirestore({ booking, payment, slotLock: null }); // legitimately released by handleCancelBooking

    await reconcilePaymentSync(
      BOOKING_ID,
      booking,
      payment,
      { transaction_status: 'capture', fraud_status: 'accept', transaction_id: 'txn-legit-cancel', payment_type: 'credit_card' }
    );

    const { booking: after, slotLock } = await readAll();
    // Status is left as the legitimate cancellation -- not resurrected to 'pending'.
    expect(after?.status).toBe('cancelled');
    expect(after?.refundRequired).toBe(true);
    expect(slotLock).toBeNull();
  });
});
