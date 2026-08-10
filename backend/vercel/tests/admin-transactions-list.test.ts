/**
 * Admin Transactions Runtime Fix (Batch 10B-5B follow-up)
 *
 * getTransactionsList's Firestore queries -- bookings.where(paymentMethod==...)
 * .orderBy(createdAt) and payments.where(environment==...).orderBy(createdAt) --
 * require composite indexes that did not exist on the hosted project (confirmed
 * via `firebase firestore:indexes`), causing every /api/admin/transactions
 * request to 500 with FAILED_PRECONDITION. The Firestore emulator does not
 * enforce composite indexes, so these tests exercise the DTO/filtering
 * contract (query shape + response mapping), not the index requirement itself
 * -- that is verified live in Preview once the indexes are deployed.
 *
 * Also covers: raw Firestore Timestamps are converted to ISO strings (the
 * frontend calls `new Date(tx.createdAt)`, which silently produces an Invalid
 * Date from an unconverted Timestamp object), and status filtering is applied
 * in-memory across both providers rather than as a second Firestore .where(),
 * so no additional composite index is required per provider+status pair.
 *
 * Exercises the actual production function against the Firestore emulator,
 * matching the convention in admin-registration-privacy.test.ts.
 */
import { Timestamp } from 'firebase-admin/firestore';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { getTransactionsList } from '../src/admin/admin.service.js';
import { db } from '../src/lib/firebase-admin.js';

const CASH_BOOKING_ID = 'booking-10b-5b-tx-cash';
const OTHER_BOOKING_ID = 'booking-10b-5b-tx-other';
const PAYMENT_ID = 'payment-10b-5b-tx-midtrans';

function cashBooking(overrides: Record<string, any> = {}) {
  return {
    paymentMethod: 'cash_on_service',
    paymentStatus: 'not_required',
    totalPrice: 60000,
    customerId: 'customer-10b-5b',
    barberId: 'barber-10b-5b',
    createdAt: Timestamp.now(),
    ...overrides,
  };
}

function midtransPayment(overrides: Record<string, any> = {}) {
  return {
    transactionId: 'txn-10b-5b-midtrans',
    bookingId: OTHER_BOOKING_ID,
    environment: 'sandbox',
    orderId: 'URB-booking-10b-5b-tx-other',
    grossAmount: 85000,
    status: 'paid',
    paymentType: 'qris',
    createdAt: Timestamp.now(),
    paidAt: Timestamp.now(),
    ...overrides,
  };
}

async function cleanup() {
  await db.collection('bookings').doc(CASH_BOOKING_ID).delete();
  await db.collection('bookings').doc(OTHER_BOOKING_ID).delete();
  await db.collection('payments').doc(PAYMENT_ID).delete();
}

describe('Admin transactions list DTO and filtering contract (Batch 10B-5B)', () => {
  beforeEach(cleanup);
  afterAll(cleanup);

  it('A. normal page returns a 200-compatible DTO shape', async () => {
    await db.collection('bookings').doc(CASH_BOOKING_ID).set(cashBooking());

    const result = await getTransactionsList({}, { pageSize: 20 });

    expect(Array.isArray(result.items)).toBe(true);
    expect(typeof result.hasMore).toBe('boolean');
    const found = result.items.find((i) => i.bookingId === CASH_BOOKING_ID);
    expect(found).toBeDefined();
  });

  it('B. empty payment collection returns []', async () => {
    const result = await getTransactionsList({ provider: 'midtrans_sandbox' }, { pageSize: 20 });
    expect(result.items).toEqual([]);
    expect(result.hasMore).toBe(false);
  });

  it('C. legacy cash_on_service records are returned safely with the correct DTO shape', async () => {
    await db.collection('bookings').doc(CASH_BOOKING_ID).set(cashBooking({ totalPrice: 45000 }));

    const result = await getTransactionsList({ provider: 'cash_on_service' }, { pageSize: 20 });
    const found = result.items.find((i) => i.bookingId === CASH_BOOKING_ID);

    expect(found).toBeDefined();
    expect(found?.transactionId).toBe(`cash-${CASH_BOOKING_ID}`);
    expect(found?.provider).toBe('cash_on_service');
    expect(found?.environment).toBe('cash');
    expect(found?.status).toBe('not_required');
    expect(found?.grossAmount).toBe(45000);
  });

  it('D. provider=cash_on_service with zero matches returns [], not a crash', async () => {
    const result = await getTransactionsList({ provider: 'cash_on_service' }, { pageSize: 20 });
    expect(result.items).toEqual([]);
  });

  it('E. provider=midtrans_sandbox filter returns only sandbox payments', async () => {
    await db.collection('bookings').doc(CASH_BOOKING_ID).set(cashBooking());
    await db.collection('payments').doc(PAYMENT_ID).set(midtransPayment());

    const result = await getTransactionsList({ provider: 'midtrans_sandbox' }, { pageSize: 20 });

    expect(result.items.every((i) => i.provider === 'midtrans_sandbox')).toBe(true);
    const found = result.items.find((i) => i.bookingId === OTHER_BOOKING_ID);
    expect(found).toBeDefined();
    expect(found?.grossAmount).toBe(85000);
  });

  it('F. legacy record missing an optional display field does not crash', async () => {
    const payment = midtransPayment();
    delete (payment as Record<string, any>).paymentType;
    delete (payment as Record<string, any>).orderId;
    await db.collection('payments').doc(PAYMENT_ID).set(payment);

    const result = await getTransactionsList({ provider: 'midtrans_sandbox' }, { pageSize: 20 });
    const found = result.items.find((i) => i.bookingId === OTHER_BOOKING_ID);

    expect(found).toBeDefined();
    expect(found?.paymentType).toBeUndefined();
  });

  it('G. amount maps correctly for both providers (totalPrice -> grossAmount, grossAmount passthrough)', async () => {
    await db.collection('bookings').doc(CASH_BOOKING_ID).set(cashBooking({ totalPrice: 123000 }));
    await db.collection('payments').doc(PAYMENT_ID).set(midtransPayment({ grossAmount: 456000 }));

    const result = await getTransactionsList({}, { pageSize: 20 });

    expect(result.items.find((i) => i.bookingId === CASH_BOOKING_ID)?.grossAmount).toBe(123000);
    expect(result.items.find((i) => i.bookingId === OTHER_BOOKING_ID)?.grossAmount).toBe(456000);
  });

  it('H. payment status is preserved canonically, never invented', async () => {
    await db.collection('payments').doc(PAYMENT_ID).set(midtransPayment({ status: 'partially_refunded' }));

    const result = await getTransactionsList({ provider: 'midtrans_sandbox' }, { pageSize: 20 });
    const found = result.items.find((i) => i.bookingId === OTHER_BOOKING_ID);

    expect(found?.status).toBe('partially_refunded');
  });

  it('I. status filter is applied in-memory across providers without requiring a second Firestore filter', async () => {
    await db.collection('bookings').doc(CASH_BOOKING_ID).set(cashBooking());
    await db.collection('payments').doc(PAYMENT_ID).set(midtransPayment({ status: 'paid' }));

    const paidOnly = await getTransactionsList({ status: 'paid' }, { pageSize: 20 });
    expect(paidOnly.items.every((i) => i.status === 'paid')).toBe(true);
    expect(paidOnly.items.some((i) => i.bookingId === OTHER_BOOKING_ID)).toBe(true);
    expect(paidOnly.items.some((i) => i.bookingId === CASH_BOOKING_ID)).toBe(false);

    const notRequiredOnly = await getTransactionsList({ status: 'not_required' }, { pageSize: 20 });
    expect(notRequiredOnly.items.some((i) => i.bookingId === CASH_BOOKING_ID)).toBe(true);
    expect(notRequiredOnly.items.some((i) => i.bookingId === OTHER_BOOKING_ID)).toBe(false);
  });

  it('J. a status filter with zero matches returns [], not a crash', async () => {
    await db.collection('bookings').doc(CASH_BOOKING_ID).set(cashBooking());

    const result = await getTransactionsList({ status: 'refunded' }, { pageSize: 20 });
    expect(result.items).toEqual([]);
  });

  it('createdAt is converted to a parseable ISO string, not a raw Firestore Timestamp', async () => {
    await db.collection('bookings').doc(CASH_BOOKING_ID).set(cashBooking());

    const result = await getTransactionsList({ provider: 'cash_on_service' }, { pageSize: 20 });
    const found = result.items.find((i) => i.bookingId === CASH_BOOKING_ID);

    expect(typeof found?.createdAt).toBe('string');
    expect(new Date(found!.createdAt!).toString()).not.toBe('Invalid Date');
  });

  it('paidAt is converted to a parseable ISO string when present, and omitted when absent', async () => {
    await db.collection('payments').doc(PAYMENT_ID).set(midtransPayment());
    await db.collection('bookings').doc(CASH_BOOKING_ID).set(cashBooking());

    const result = await getTransactionsList({}, { pageSize: 20 });
    const midtransItem = result.items.find((i) => i.bookingId === OTHER_BOOKING_ID);
    const cashItem = result.items.find((i) => i.bookingId === CASH_BOOKING_ID);

    expect(typeof midtransItem?.paidAt).toBe('string');
    expect(new Date(midtransItem!.paidAt!).toString()).not.toBe('Invalid Date');
    expect(cashItem?.paidAt).toBeUndefined();
  });
});
