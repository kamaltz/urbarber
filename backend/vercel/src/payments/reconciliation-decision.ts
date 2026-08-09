/**
 * Shared reconciliation decision logic -- the single authoritative mapping from
 * "Midtrans transaction_status/fraud_status" to "what should happen to the booking's
 * payment state and slot ownership".
 *
 * Both the webhook (api/webhook.ts, via src/payments/webhook-reconciliation.ts) and
 * the client-triggered sync endpoint (api/payments.ts, via
 * src/payments/sync-reconciliation.ts) call this same pure function so the two
 * entry points can never diverge on what a given Midtrans status means. Each caller
 * still owns its own I/O (webhook uses a Firestore transaction for
 * concurrent-notification safety; sync uses sequential writes), only the decision is
 * shared.
 *
 * Batch 09F-1: extracted the evidence-gated recovery rule (originally added to sync
 * only, see Batch 09E-P0) so the webhook gets the same recovery semantics instead of
 * being permanently gated by `!paymentData.paidAt`.
 */
import { type CanonicalPaymentStatus, mapMidtransStatus, shouldReleaseSlot } from './status-mapper.js';

export interface ReconciliationDecision {
  mappedStatus: CanonicalPaymentStatus;
  /** Slot lock should exist and be status:'finalized' for this booking. */
  finalizeSlot: boolean;
  /** Slot lock should be deleted. */
  releaseSlot: boolean;
  /**
   * booking.status should be forced back to 'pending'. Only ever true alongside
   * finalizeSlot, and only when the booking is 'cancelled' WITHOUT any evidence of a
   * legitimate cancellation (cancelledAt / cancellationReason / refundRequired) --
   * see isLegitimateTerminalState. A booking cancelled through the real cancellation
   * path always carries at least one of those markers, so their total absence on a
   * 'cancelled' + provider-confirmed-paid booking can only be reconciliation/system
   * corruption (e.g. the Batch 09E-P0 sync bug, or an equivalent webhook race).
   */
  resurrectBooking: boolean;
  /**
   * True when the booking is in a legitimate terminal state that must never be
   * touched: 'cancelled' bearing a legitimate-cancellation marker, or 'rejected'
   * (api/app.ts's barber-reject action is the only writer of that status and always
   * stamps respondedAt -- there is no known bug path that produces a spurious
   * 'rejected' status, unlike 'cancelled').
   */
  isLegitimateCancellation: boolean;
}

export function decideReconciliation(
  bookingData: Record<string, any>,
  paymentData: Record<string, any>,
  midtransStatus: { transaction_status?: string | null; fraud_status?: string | null }
): ReconciliationDecision {
  const mappedStatus = mapMidtransStatus(midtransStatus.transaction_status, midtransStatus.fraud_status);

  if (mappedStatus === 'paid') {
    const isCancelledWithEvidence =
      bookingData.status === 'cancelled' &&
      Boolean(bookingData.cancelledAt || bookingData.cancellationReason || bookingData.refundRequired);
    // 'rejected' is only ever written by the barber-reject action (api/app.ts), which
    // always stamps respondedAt -- there is no known bug path that produces a
    // spurious 'rejected' status, so it needs no evidence gate the way 'cancelled'
    // does.
    const isRejected = bookingData.status === 'rejected';
    const isLegitimateTerminalState = isCancelledWithEvidence || isRejected;

    if (isLegitimateTerminalState) {
      // Underlying charge is captured, but the booking was legitimately cancelled/
      // rejected after payment (refund owed). Never resurrect it and never
      // re-finalize a slot for it.
      return {
        mappedStatus,
        finalizeSlot: false,
        releaseSlot: false,
        resurrectBooking: false,
        isLegitimateCancellation: true,
      };
    }

    const isCorruptedCancellation = bookingData.status === 'cancelled';

    return {
      mappedStatus,
      finalizeSlot: true,
      releaseSlot: false,
      resurrectBooking: isCorruptedCancellation,
      isLegitimateCancellation: false,
    };
  }

  return {
    mappedStatus,
    finalizeSlot: false,
    releaseSlot: shouldReleaseSlot(mappedStatus),
    resurrectBooking: false,
    isLegitimateCancellation: false,
  };
}

export type { CanonicalPaymentStatus };
