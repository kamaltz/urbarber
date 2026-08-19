/**
 * Refund policy unit tests (Home/Auth/Refund stabilization pass).
 *
 * Covers the agreed cancellation-refund policy mapped onto the ACTUAL
 * booking lifecycle (pending/accepted/rejected/in_progress/completed/
 * cancelled -- en_route/arrived are bookingTracking.trackingStatus, never a
 * bookingStatus), plus the pure write-shape computation that preserves
 * payment truth and restores voucher usage idempotently. Pure functions --
 * no Firestore emulator required for decideRefund; computeRefundUpdate only
 * constructs DocumentReferences (no I/O), safe under the shared emulator env
 * config every test file in this suite already runs under.
 */
import { describe, expect, it } from 'vitest';
import { computeRefundUpdate, decideRefund } from '../src/payments/refund-service';

describe('decideRefund', () => {
  it('1. paid + pending customer cancel -> auto_approved (never even accepted)', () => {
    const decision = decideRefund({ initiator: 'customer', bookingStatus: 'pending' });
    expect(decision.status).toBe('auto_approved');
    expect(decision.reason).toBe('customer_cancelled_before_acceptance');
  });

  it('2. paid + accepted customer cancel, tracking inactive/never started -> auto_approved', () => {
    const decision = decideRefund({ initiator: 'customer', bookingStatus: 'accepted', trackingStatus: 'inactive' });
    expect(decision.status).toBe('auto_approved');
    expect(decision.reason).toBe('customer_cancelled_before_service_started');
  });

  it('2b. paid + accepted customer cancel, no tracking doc at all -> auto_approved', () => {
    const decision = decideRefund({ initiator: 'customer', bookingStatus: 'accepted', trackingStatus: null });
    expect(decision.status).toBe('auto_approved');
  });

  it('3. paid + accepted customer cancel, barber en_route -> review_required', () => {
    const decision = decideRefund({ initiator: 'customer', bookingStatus: 'accepted', trackingStatus: 'en_route' });
    expect(decision.status).toBe('review_required');
    expect(decision.reason).toBe('customer_cancelled_after_barber_en_route');
  });

  it('4. paid + accepted customer cancel, barber arrived -> review_required', () => {
    const decision = decideRefund({ initiator: 'customer', bookingStatus: 'accepted', trackingStatus: 'arrived' });
    expect(decision.status).toBe('review_required');
  });

  it('5. barber reject (always from pending) -> auto_approved regardless of tracking', () => {
    const decision = decideRefund({ initiator: 'barber', bookingStatus: 'pending' });
    expect(decision.status).toBe('auto_approved');
    expect(decision.reason).toBe('barber_rejected');
  });

  it('6. admin/system cancellation -> auto_approved regardless of booking status or tracking', () => {
    const fromPending = decideRefund({ initiator: 'admin', bookingStatus: 'pending' });
    const fromAcceptedEnRoute = decideRefund({ initiator: 'admin', bookingStatus: 'accepted', trackingStatus: 'en_route' });
    expect(fromPending.status).toBe('auto_approved');
    expect(fromAcceptedEnRoute.status).toBe('auto_approved');
    expect(fromAcceptedEnRoute.reason).toBe('admin_system_cancelled');
  });
});

describe('computeRefundUpdate', () => {
  const baseBooking = { customerId: 'cust-1', totalPrice: 50000 };
  const timestamp = '2026-08-19T10:00:00.000Z';

  it('7. payment truth is preserved -- the returned bookingUpdate never touches paymentStatus', () => {
    const result = computeRefundUpdate({
      bookingId: 'b1',
      bookingData: baseBooking,
      paymentData: { grossAmount: 75000 },
      decision: { status: 'auto_approved', reason: 'customer_cancelled_before_acceptance' },
      initiator: 'customer',
      timestamp,
    });

    expect(result.bookingUpdate).not.toHaveProperty('paymentStatus');
    expect(result.bookingUpdate.refundRequired).toBe(true);
    expect(result.bookingUpdate.refund).toMatchObject({
      status: 'auto_approved',
      amount: 75000,
      reason: 'customer_cancelled_before_acceptance',
      initiatedBy: 'customer',
      requestedAt: timestamp,
      resolvedAt: null,
      providerRefundId: null,
    });
  });

  it('8. refund amount resolution: grossAmount > amount > booking.totalPrice > 0', () => {
    const withGross = computeRefundUpdate({
      bookingId: 'b1',
      bookingData: baseBooking,
      paymentData: { grossAmount: 100, amount: 200 },
      decision: { status: 'auto_approved', reason: 'x' },
      initiator: 'customer',
      timestamp,
    });
    expect(withGross.bookingUpdate.refund.amount).toBe(100);

    const withAmountOnly = computeRefundUpdate({
      bookingId: 'b1',
      bookingData: baseBooking,
      paymentData: { amount: 200 },
      decision: { status: 'auto_approved', reason: 'x' },
      initiator: 'customer',
      timestamp,
    });
    expect(withAmountOnly.bookingUpdate.refund.amount).toBe(200);

    const withNeitherOnPayment = computeRefundUpdate({
      bookingId: 'b1',
      bookingData: baseBooking,
      paymentData: {},
      decision: { status: 'auto_approved', reason: 'x' },
      initiator: 'customer',
      timestamp,
    });
    expect(withNeitherOnPayment.bookingUpdate.refund.amount).toBe(50000);

    const withNothingAtAll = computeRefundUpdate({
      bookingId: 'b1',
      bookingData: { customerId: 'cust-1' },
      paymentData: {},
      decision: { status: 'auto_approved', reason: 'x' },
      initiator: 'customer',
      timestamp,
    });
    expect(withNothingAtAll.bookingUpdate.refund.amount).toBe(0);
  });

  it('9. auto-approved refund with a redemption counted toward a limit -> voucher restore refs returned', () => {
    const result = computeRefundUpdate({
      bookingId: 'b1',
      bookingData: baseBooking,
      paymentData: { grossAmount: 50000, voucherCode: 'HEMAT10' },
      decision: { status: 'auto_approved', reason: 'customer_cancelled_before_acceptance' },
      initiator: 'customer',
      timestamp,
      voucherRedemption: { countedTowardLimit: true },
    });

    expect(result.voucherRestore).not.toBeNull();
    expect(result.voucherRestore!.voucherRef.path).toBe('vouchers/HEMAT10');
    expect(result.voucherRestore!.voucherUserRedemptionRef.path).toBe('voucherUserRedemptions/HEMAT10_cust-1');
    expect(result.voucherRestore!.voucherRedemptionRef.path).toBe('voucherRedemptions/b1');
    expect(result.voucherRedemptionReversalOnly).toBeNull();
  });

  it('10. auto-approved refund with a redemption that never counted toward any limit -> reversal-only, no counter decrement', () => {
    const result = computeRefundUpdate({
      bookingId: 'b1',
      bookingData: baseBooking,
      paymentData: { grossAmount: 50000, voucherCode: 'HEMAT10' },
      decision: { status: 'auto_approved', reason: 'x' },
      initiator: 'customer',
      timestamp,
      voucherRedemption: { countedTowardLimit: false },
    });

    expect(result.voucherRestore).toBeNull();
    expect(result.voucherRedemptionReversalOnly).not.toBeNull();
    expect(result.voucherRedemptionReversalOnly!.path).toBe('voucherRedemptions/b1');
  });

  it('11. idempotency: an already-reversed redemption is never restored twice', () => {
    const result = computeRefundUpdate({
      bookingId: 'b1',
      bookingData: baseBooking,
      paymentData: { grossAmount: 50000, voucherCode: 'HEMAT10' },
      decision: { status: 'auto_approved', reason: 'x' },
      initiator: 'customer',
      timestamp,
      voucherRedemption: { countedTowardLimit: true, reversedAt: '2026-08-18T00:00:00.000Z' },
    });

    expect(result.voucherRestore).toBeNull();
    expect(result.voucherRedemptionReversalOnly).toBeNull();
  });

  it('12. review_required never restores voucher usage, even if a redemption exists', () => {
    const result = computeRefundUpdate({
      bookingId: 'b1',
      bookingData: baseBooking,
      paymentData: { grossAmount: 50000, voucherCode: 'HEMAT10' },
      decision: { status: 'review_required', reason: 'customer_cancelled_after_barber_en_route' },
      initiator: 'customer',
      timestamp,
      voucherRedemption: { countedTowardLimit: true },
    });

    expect(result.voucherRestore).toBeNull();
    expect(result.voucherRedemptionReversalOnly).toBeNull();
    expect(result.bookingUpdate.refund.status).toBe('review_required');
  });

  it('13. no voucher code on the payment -> no voucher restore attempted at all', () => {
    const result = computeRefundUpdate({
      bookingId: 'b1',
      bookingData: baseBooking,
      paymentData: { grossAmount: 50000 },
      decision: { status: 'auto_approved', reason: 'x' },
      initiator: 'customer',
      timestamp,
    });

    expect(result.voucherRestore).toBeNull();
    expect(result.voucherRedemptionReversalOnly).toBeNull();
  });
});
