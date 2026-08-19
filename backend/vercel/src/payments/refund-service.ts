/**
 * Cancellation refund policy + the Firestore write it produces.
 *
 * Payment-first truth preservation (CLAUDE.md): paymentStatus is NEVER
 * touched by cancellation -- if money was received, `paymentStatus` stays
 * 'paid' forever. Refund lifecycle lives entirely in a separate `refund`
 * object on the booking document, alongside the pre-existing `refundRequired`
 * boolean (kept for backward compatibility with the admin force-deletion
 * cascades in src/admin/{user,barber}-account-management.ts, which predate
 * this richer object and continue to only set that flag).
 *
 * `decideRefund` and `computeRefundUpdate` are pure (no Firestore I/O) so
 * they're unit-testable without an emulator -- callers (handleCancelBooking,
 * handleBarberRespondToBooking in api/app.ts) own all actual reads/writes,
 * performed inside a single db.runTransaction alongside the booking status
 * update and slot-lock release, for atomicity and idempotency.
 */
import { voucherUserRedemptionDocId } from './voucher-service.js';
import { db } from '../lib/firebase-admin.js';

export type RefundInitiator = 'customer' | 'barber' | 'admin';
export type RefundDecisionStatus = 'auto_approved' | 'review_required';

export interface RefundDecision {
  status: RefundDecisionStatus;
  reason: string;
}

/**
 * Maps the agreed cancellation-refund policy onto the ACTUAL booking
 * lifecycle. BookingStatus is exactly pending/accepted/rejected/in_progress/
 * completed/cancelled (src/types/domain.ts) -- 'en_route'/'arrived' are NOT
 * booking statuses, they're bookingTracking.trackingStatus, a deliberately
 * separate field (firestore.rules: "TrackingStatus is intentionally separate
 * from BookingStatus"). This function is only ever called for a booking that
 * has already passed handleCancelBooking's/handleBarberRespondToBooking's own
 * state gate (pending/accepted only -- in_progress/completed/cancelled can't
 * reach here), so those two statuses are excluded from consideration here.
 *
 *  - Barber reject (always from 'pending'): full auto-approved refund.
 *  - Admin/system cancellation: full auto-approved refund (provider-side
 *    issue, per policy -- admin can cancel from either pending or accepted).
 *  - Customer cancel while 'pending': full auto-approved refund (never even
 *    accepted).
 *  - Customer cancel while 'accepted' AND the barber is already en_route/
 *    arrived (operationally already heading to the customer): review
 *    required, not automatic.
 *  - Customer cancel while 'accepted' and tracking hasn't started yet: full
 *    auto-approved refund (still before any meaningful fulfillment
 *    progress).
 */
export function decideRefund(params: {
  initiator: RefundInitiator;
  bookingStatus: string;
  trackingStatus?: string | null;
}): RefundDecision {
  const { initiator, bookingStatus, trackingStatus } = params;

  if (initiator === 'barber') {
    return { status: 'auto_approved', reason: 'barber_rejected' };
  }
  if (initiator === 'admin') {
    return { status: 'auto_approved', reason: 'admin_system_cancelled' };
  }
  if (bookingStatus === 'pending') {
    return { status: 'auto_approved', reason: 'customer_cancelled_before_acceptance' };
  }
  if (trackingStatus === 'en_route' || trackingStatus === 'arrived') {
    return { status: 'review_required', reason: 'customer_cancelled_after_barber_en_route' };
  }
  return { status: 'auto_approved', reason: 'customer_cancelled_before_service_started' };
}

export interface RefundUpdateResult {
  /** Merge directly into the same booking update payload as the status/cancelledAt change. */
  bookingUpdate: {
    refundRequired: true;
    refund: {
      status: RefundDecisionStatus;
      amount: number;
      reason: string;
      initiatedBy: RefundInitiator;
      requestedAt: string;
      resolvedAt: null;
      providerRefundId: null;
    };
  };
  /** Present only for an auto-approved refund whose voucher redemption both
   * exists and counted toward a limit -- null whenever there's nothing to
   * give back (no voucher, review-required, or already reversed). Caller
   * applies these writes itself (all transaction reads must precede all
   * writes, so this function never calls t.get/t.set/t.update directly). */
  voucherRestore: {
    voucherRef: FirebaseFirestore.DocumentReference;
    voucherUserRedemptionRef: FirebaseFirestore.DocumentReference;
    voucherRedemptionRef: FirebaseFirestore.DocumentReference;
  } | null;
  /** Set whenever a voucherRedemptions/{bookingId} doc exists and needs its
   * reversedAt stamped, even if nothing was counted toward a limit (so a
   * retry doesn't re-evaluate it.) Always the same doc as
   * voucherRestore.voucherRedemptionRef when both are present. */
  voucherRedemptionReversalOnly: FirebaseFirestore.DocumentReference | null;
}

/**
 * Pure computation of what the refund-related Firestore writes should be.
 * `voucherRedemption` must be the ALREADY-FETCHED voucherRedemptions/{bookingId}
 * doc data (or undefined if it doesn't exist / wasn't looked up because the
 * booking had no voucherCode) -- read by the caller before any transaction
 * writes, per Firestore's read-before-write rule.
 */
export function computeRefundUpdate(params: {
  bookingId: string;
  bookingData: FirebaseFirestore.DocumentData;
  paymentData: FirebaseFirestore.DocumentData;
  decision: RefundDecision;
  initiator: RefundInitiator;
  timestamp: string;
  voucherRedemption?: FirebaseFirestore.DocumentData;
}): RefundUpdateResult {
  const { bookingId, bookingData, paymentData, decision, initiator, timestamp, voucherRedemption } = params;

  const refundAmount =
    typeof paymentData.grossAmount === 'number'
      ? paymentData.grossAmount
      : typeof paymentData.amount === 'number'
      ? paymentData.amount
      : typeof bookingData.totalPrice === 'number'
      ? bookingData.totalPrice
      : 0;

  const bookingUpdate: RefundUpdateResult['bookingUpdate'] = {
    refundRequired: true,
    refund: {
      status: decision.status,
      amount: refundAmount,
      reason: decision.reason,
      initiatedBy: initiator,
      requestedAt: timestamp,
      resolvedAt: null,
      providerRefundId: null,
    },
  };

  let voucherRestore: RefundUpdateResult['voucherRestore'] = null;
  let voucherRedemptionReversalOnly: RefundUpdateResult['voucherRedemptionReversalOnly'] = null;

  const voucherCode: string | undefined = paymentData.voucherCode;
  if (decision.status === 'auto_approved' && voucherCode && voucherRedemption && !voucherRedemption.reversedAt) {
    const voucherRedemptionRef = db.collection('voucherRedemptions').doc(bookingId);

    if (voucherRedemption.countedTowardLimit) {
      voucherRestore = {
        voucherRef: db.collection('vouchers').doc(voucherCode),
        voucherUserRedemptionRef: db
          .collection('voucherUserRedemptions')
          .doc(voucherUserRedemptionDocId(voucherCode, bookingData.customerId)),
        voucherRedemptionRef,
      };
    } else {
      // Redemption existed but never counted toward any limit (e.g. the
      // limit was already reached at redemption time) -- nothing to give
      // back, but still stamp reversedAt so a retry doesn't re-evaluate it.
      voucherRedemptionReversalOnly = voucherRedemptionRef;
    }
  }

  return { bookingUpdate, voucherRestore, voucherRedemptionReversalOnly };
}
