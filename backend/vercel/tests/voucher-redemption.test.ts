import { beforeEach, describe, expect, it } from 'vitest';
import { getSlotLockId } from '../src/bookings/slot-lock.js';
import { db } from '../src/lib/firebase-admin.js';
import { reconcilePaymentTransaction } from '../src/payments/reconcile-transaction.js';
import { voucherUserRedemptionDocId } from '../src/payments/voucher-service.js';

/**
 * Voucher redemption finalizes exactly once, on the payment's first paid
 * transition (inside reconcilePaymentTransaction's existing !paymentData.paidAt
 * guard) -- these tests prove that a repeated/duplicate webhook for the same
 * booking can never double-count a voucher redemption, mirroring the existing
 * paidAt-idempotency proof in reconcile-transaction-atomicity.test.ts.
 */

const BARBER_ID = 'barber-voucher-redemption';
const CUSTOMER_ID = 'cust-voucher-redemption';
const VOUCHER_CODE = 'REDEEMTEST';
const DATE = '2026-09-15';
const START_TIME = '10:00';

function bookingId(suffix: string) {
  return `booking-voucher-redemption-${suffix}`;
}

async function seed(id: string, voucherOverrides: Record<string, any> = {}) {
  const slotLockId = getSlotLockId(BARBER_ID, DATE, `${START_TIME}-${id}`);
  await db.collection('bookings').doc(id).set({
    id,
    customerId: CUSTOMER_ID,
    barberId: BARBER_ID,
    serviceId: 'svc-voucher-redemption',
    date: DATE,
    startTime: `${START_TIME}-${id}`,
    price: 40000,
    status: 'pending',
  });
  await db.collection('payments').doc(id).set({
    bookingId: id,
    customerId: CUSTOMER_ID,
    orderId: `URB-${id}`,
    amount: 30000,
    grossAmount: 30000,
    baseAmount: 40000,
    voucherCode: VOUCHER_CODE,
    voucherDiscount: 10000,
    currency: 'IDR',
    method: 'midtrans_sandbox',
    status: 'initiated',
  });
  await db.collection('slotLocks').doc(slotLockId).delete();

  await db.collection('vouchers').doc(VOUCHER_CODE).set({
    code: VOUCHER_CODE,
    name: 'Redemption Test Voucher',
    discountType: 'fixed',
    discountValue: 10000,
    usageCount: 0,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'admin-1',
    ...voucherOverrides,
  });
}

describe('voucher redemption finalization (reconcilePaymentTransaction)', () => {
  beforeEach(async () => {
    await db.collection('voucherRedemptions').doc(bookingId('a')).delete();
    await db.collection('voucherRedemptions').doc(bookingId('b')).delete();
    await db.collection('voucherUserRedemptions').doc(voucherUserRedemptionDocId(VOUCHER_CODE, CUSTOMER_ID)).delete();
  });

  it('records a redemption and increments usageCount exactly once on the first paid transition', async () => {
    const id = bookingId('a');
    await seed(id);

    await reconcilePaymentTransaction(id, {
      transaction_status: 'capture',
      fraud_status: 'accept',
      transaction_id: 'txn-redeem-a',
      payment_type: 'credit_card',
    });

    const [redemptionSnap, voucherSnap] = await Promise.all([
      db.collection('voucherRedemptions').doc(id).get(),
      db.collection('vouchers').doc(VOUCHER_CODE).get(),
    ]);

    expect(redemptionSnap.exists).toBe(true);
    expect(redemptionSnap.data()?.countedTowardLimit).toBe(true);
    expect(redemptionSnap.data()?.discountAmount).toBe(10000);
    expect(voucherSnap.data()?.usageCount).toBe(1);
  });

  it('a duplicate/repeated webhook for the SAME booking never double-counts the redemption', async () => {
    const id = bookingId('a');
    await seed(id);

    const status = {
      transaction_status: 'capture',
      fraud_status: 'accept',
      transaction_id: 'txn-redeem-dup',
      payment_type: 'credit_card',
    };

    // First call: real paid transition.
    await reconcilePaymentTransaction(id, status);
    // Simulated duplicate webhook delivery for the same order.
    await reconcilePaymentTransaction(id, status);
    await reconcilePaymentTransaction(id, status);

    const [voucherSnap, redemptionsSnap] = await Promise.all([
      db.collection('vouchers').doc(VOUCHER_CODE).get(),
      db.collection('voucherRedemptions').where('bookingId', '==', id).get(),
    ]);

    expect(voucherSnap.data()?.usageCount).toBe(1); // never incremented past 1
    expect(redemptionsSnap.size).toBe(1); // exactly one redemption record
  });

  it('a different booking redeeming the same voucher increments usageCount independently (no cross-booking interference)', async () => {
    const idA = bookingId('a');
    const idB = bookingId('b');
    await seed(idA);
    // Second booking reuses the same voucher doc (shared usageCount) but is its own booking/payment.
    await db.collection('bookings').doc(idB).set({
      id: idB,
      customerId: 'cust-voucher-redemption-2',
      barberId: BARBER_ID,
      serviceId: 'svc-voucher-redemption',
      date: DATE,
      startTime: `${START_TIME}-${idB}`,
      price: 40000,
      status: 'pending',
    });
    await db.collection('payments').doc(idB).set({
      bookingId: idB,
      customerId: 'cust-voucher-redemption-2',
      orderId: `URB-${idB}`,
      amount: 30000,
      grossAmount: 30000,
      baseAmount: 40000,
      voucherCode: VOUCHER_CODE,
      voucherDiscount: 10000,
      currency: 'IDR',
      method: 'midtrans_sandbox',
      status: 'initiated',
    });

    await reconcilePaymentTransaction(idA, {
      transaction_status: 'capture',
      fraud_status: 'accept',
      transaction_id: 'txn-redeem-multi-a',
      payment_type: 'credit_card',
    });
    await reconcilePaymentTransaction(idB, {
      transaction_status: 'capture',
      fraud_status: 'accept',
      transaction_id: 'txn-redeem-multi-b',
      payment_type: 'credit_card',
    });

    const voucherSnap = await db.collection('vouchers').doc(VOUCHER_CODE).get();
    expect(voucherSnap.data()?.usageCount).toBe(2);

    await db.collection('bookings').doc(idB).delete();
    await db.collection('payments').doc(idB).delete();
    await db.collection('voucherRedemptions').doc(idB).delete();
  });

  it('usage-limit-exhausted redemption still applies the already-charged discount but is not counted toward the limit', async () => {
    const id = bookingId('a');
    await seed(id, { usageLimit: 1, usageCount: 1 }); // limit already exhausted by other bookings

    await reconcilePaymentTransaction(id, {
      transaction_status: 'capture',
      fraud_status: 'accept',
      transaction_id: 'txn-redeem-exhausted',
      payment_type: 'credit_card',
    });

    const [redemptionSnap, voucherSnap, paymentSnap] = await Promise.all([
      db.collection('voucherRedemptions').doc(id).get(),
      db.collection('vouchers').doc(VOUCHER_CODE).get(),
      db.collection('payments').doc(id).get(),
    ]);

    // Already-captured payment is never retroactively altered.
    expect(paymentSnap.data()?.status).toBe('paid');
    expect(redemptionSnap.data()?.countedTowardLimit).toBe(false);
    expect(voucherSnap.data()?.usageCount).toBe(1); // unchanged -- was already at the limit
  });
});
