/**
 * Batch 09F-1B: HTTP/service-level regression for P1_SYNC_UNOPENED_SNAP_500.
 *
 * The 09F-1 fix was previously covered only at the error-classifier unit level
 * (isUnrecognizedTransactionError). This exercises the actual production function
 * POST /api/payments/sync delegates to (syncPaymentStatusService), with an injected
 * fake Snap client reproducing the exact "Transaction doesn't exist" 404 shape
 * midtrans-client throws, proving end-to-end that:
 *  - the service returns a controlled 200-equivalent result, not a thrown error
 *  - no reconciliation transaction runs (booking/payment/slotLock stay untouched)
 *  - a genuine, unrelated Midtrans error still propagates (mapped to 500 by the
 *    caller, api/payments.ts's handleSyncPayment)
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSlotLockId } from '../src/bookings/slot-lock.js';
import { db } from '../src/lib/firebase-admin.js';
import type { MidtransStatusClient } from '../src/payments/sync-payment-service.js';
import { SyncInvalidStateError, syncPaymentStatusService } from '../src/payments/sync-payment-service.js';

// syncPaymentStatusService takes an injectable Midtrans Snap client (see
// sync-payment-service.ts) instead of requiring vi.mock interop with the
// require()'d 'midtrans-client' CJS package -- this fakes exactly the shape
// (transaction.status) and error type (MidtransError-like, with httpStatusCode/
// ApiResponse) the real SDK produces, reproducing the "Transaction doesn't exist"
// 404 case end-to-end through the actual production function.
const transactionStatusMock = vi.fn();
const fakeSnapClient: MidtransStatusClient = { transaction: { status: transactionStatusMock } };

const BARBER_ID = 'barber-09f-1b-sync';
const BOOKING_ID = 'booking-09f-1b-sync';
const CUSTOMER_ID = 'cust-09f-1b-sync';
const DATE = '2026-09-11';
const START_TIME = '09:00';
const SLOT_LOCK_ID = getSlotLockId(BARBER_ID, DATE, START_TIME);

function baseBooking(overrides: Record<string, any> = {}) {
  return {
    id: BOOKING_ID,
    customerId: CUSTOMER_ID,
    barberId: BARBER_ID,
    serviceId: 'svc-09f-1b-sync',
    date: DATE,
    startTime: START_TIME,
    price: 18000,
    status: 'pending',
    ...overrides,
  };
}

function basePayment(overrides: Record<string, any> = {}) {
  return {
    bookingId: BOOKING_ID,
    customerId: CUSTOMER_ID,
    orderId: `URB-${BOOKING_ID}`,
    amount: 18000,
    grossAmount: 18000,
    currency: 'IDR',
    method: 'midtrans_sandbox',
    status: 'initiated',
    ...overrides,
  };
}

async function seed(booking: Record<string, any>, payment: Record<string, any>) {
  await db.collection('bookings').doc(BOOKING_ID).set(booking);
  await db.collection('payments').doc(BOOKING_ID).set(payment);
  await db.collection('slotLocks').doc(SLOT_LOCK_ID).delete();
}

async function readAll() {
  const [b, p, s] = await Promise.all([
    db.collection('bookings').doc(BOOKING_ID).get(),
    db.collection('payments').doc(BOOKING_ID).get(),
    db.collection('slotLocks').doc(SLOT_LOCK_ID).get(),
  ]);
  return { booking: b.data(), payment: p.data(), slotLock: s.exists ? s.data() : null };
}

describe('syncPaymentStatusService -- unopened Snap (Batch 09F-1B service-level)', () => {
  beforeEach(async () => {
    transactionStatusMock.mockReset();
    await db.collection('bookings').doc(BOOKING_ID).delete();
    await db.collection('payments').doc(BOOKING_ID).delete();
    await db.collection('slotLocks').doc(SLOT_LOCK_ID).delete();
  });

  it("K. returns a controlled non-error result when Midtrans reports \"Transaction doesn't exist\" (unopened Snap)", async () => {
    const booking = baseBooking();
    const payment = basePayment();
    await seed(booking, payment);

    transactionStatusMock.mockRejectedValueOnce({
      name: 'MidtransError',
      message: `Midtrans API is returning API error. HTTP status code: 404. API response: {"status_code":"404","status_message":"Transaction doesn't exist."}`,
      httpStatusCode: 404,
      ApiResponse: { status_code: '404', status_message: "Transaction doesn't exist." },
    });

    const result = await syncPaymentStatusService(BOOKING_ID, booking, payment, fakeSnapClient);

    expect(result.paymentStatus).toBe('initiated');
    expect(result.transactionStatus).toBeNull();
    expect(result.success).toBe(true);
  });

  it('L. unopened Snap does NOT create final slot ownership', async () => {
    const booking = baseBooking();
    const payment = basePayment();
    await seed(booking, payment);

    transactionStatusMock.mockRejectedValueOnce({ httpStatusCode: 404, ApiResponse: { status_message: "Transaction doesn't exist." } });

    await syncPaymentStatusService(BOOKING_ID, booking, payment, fakeSnapClient);

    const { slotLock } = await readAll();
    expect(slotLock).toBeNull();
  });

  it('M. unopened Snap does NOT cancel the booking or mutate the payment doc', async () => {
    const booking = baseBooking();
    const payment = basePayment();
    await seed(booking, payment);

    transactionStatusMock.mockRejectedValueOnce({ httpStatusCode: 404, ApiResponse: { status_message: "Transaction doesn't exist." } });

    await syncPaymentStatusService(BOOKING_ID, booking, payment, fakeSnapClient);

    const { booking: afterBooking, payment: afterPayment } = await readAll();
    expect(afterBooking?.status).toBe('pending'); // unchanged
    expect(afterPayment?.status).toBe('initiated'); // unchanged, no reconciliation write occurred
    expect(afterPayment?.updatedAt).toBeUndefined(); // never touched by reconcilePaymentSync
  });

  it('propagates a genuine, unrelated Midtrans error (not classified as unrecognized) instead of swallowing it', async () => {
    const booking = baseBooking();
    const payment = basePayment();
    await seed(booking, payment);

    transactionStatusMock.mockRejectedValueOnce({
      name: 'MidtransError',
      message: 'Midtrans API is returning API error. HTTP status code: 401. API response: {}',
      httpStatusCode: 401,
      ApiResponse: { status_message: 'Access denied.' },
    });

    await expect(syncPaymentStatusService(BOOKING_ID, booking, payment, fakeSnapClient)).rejects.toMatchObject({ httpStatusCode: 401 });

    const { booking: afterBooking, payment: afterPayment } = await readAll();
    expect(afterBooking?.status).toBe('pending');
    expect(afterPayment?.status).toBe('initiated');
  });

  it('throws SyncInvalidStateError when no orderId is recorded (caller maps this to 400)', async () => {
    const booking = baseBooking();
    const payment = basePayment();
    delete (payment as Record<string, any>).orderId;
    await seed(booking, payment);

    await expect(syncPaymentStatusService(BOOKING_ID, booking, payment, fakeSnapClient)).rejects.toBeInstanceOf(SyncInvalidStateError);
    expect(transactionStatusMock).not.toHaveBeenCalled();
  });

  it('a recognized transaction (capture+accept) still reconciles normally through the same service call', async () => {
    const booking = baseBooking();
    const payment = basePayment();
    await seed(booking, payment);

    transactionStatusMock.mockResolvedValueOnce({
      transaction_status: 'capture',
      fraud_status: 'accept',
      transaction_id: 'txn-service-normal',
      payment_type: 'credit_card',
    });

    const result = await syncPaymentStatusService(BOOKING_ID, booking, payment, fakeSnapClient);

    expect(result.paymentStatus).toBe('paid');
    const { booking: after, payment: pAfter, slotLock } = await readAll();
    expect(pAfter?.status).toBe('paid');
    expect(after?.paymentStatus).toBe('paid');
    expect(slotLock?.status).toBe('finalized');
  });
});
