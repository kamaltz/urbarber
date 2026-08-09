/**
 * Webhook payment reconciliation -- the core logic shared by POST /api/webhook
 * (Midtrans HTTP notification handler). Extracted so this payment-critical path is
 * directly unit-testable against the Firestore emulator, mirroring
 * sync-reconciliation.ts.
 *
 * Batch 09F-1 (P1_WEBHOOK_RECOVERY_ASYMMETRY): the pre-fix webhook only finalized the
 * slot / stamped paidAt when `!paymentData.paidAt`, so once a payment was marked paid
 * once, the webhook could never repair a later corruption (e.g. booking wrongly
 * cancelled while payment/paidAt still show paid, or the slot lock missing).
 * decideReconciliation() (reconciliation-decision.ts) now applies the same
 * evidence-gated recovery for both webhook and sync: a booking is only resurrected
 * when it is 'cancelled' with NONE of the legitimate-cancellation markers
 * (cancelledAt / cancellationReason / refundRequired) that the real cancel path
 * always stamps, and 'rejected' bookings (barber-reject path) are never touched.
 *
 * Batch 09F-1B: the actual Firestore mutation now delegates to
 * reconcilePaymentTransaction (reconcile-transaction.ts), the same atomic,
 * single-transaction state-transition core sync-reconciliation.ts uses. The
 * pre-09F-1B version of this file ran its own transaction but computed its decision
 * from a booking/payment snapshot read OUTSIDE that transaction -- under concurrent
 * webhook+sync calls for the same order, that snapshot could already be stale by
 * commit time. reconcilePaymentTransaction reads fresh state (and re-derives the
 * decision) *inside* the transaction, closing that race.
 */
import { getSlotLockId } from '../bookings/slot-lock.js';
import { db } from '../lib/firebase-admin.js';
import { decideReconciliation } from './reconciliation-decision.js';
import { reconcilePaymentTransaction } from './reconcile-transaction.js';
import type { CanonicalPaymentStatus } from './status-mapper.js';

export interface WebhookMidtransStatus {
  transaction_status?: string | null;
  fraud_status?: string | null;
  payment_type?: string | null;
  transaction_id?: string | null;
}

export interface ReconcileWebhookResult {
  mappedStatus: CanonicalPaymentStatus;
  applied: boolean;
}

/**
 * Cheap pre-check, read OUTSIDE any transaction, used purely to decide whether the
 * webhook can skip calling reconcilePaymentTransaction entirely for a repeated
 * notification. It is never used to decide *what* to write -- that decision is
 * always re-derived from a transactional read inside reconcilePaymentTransaction, so
 * staleness here can at worst cause one redundant (but still safe/idempotent)
 * transaction call, never an incorrect one.
 */
export async function isAlreadyReconciled(
  bookingId: string,
  bookingData: Record<string, any>,
  paymentData: Record<string, any>,
  midtransStatus: WebhookMidtransStatus
): Promise<boolean> {
  const decision = decideReconciliation(bookingData, paymentData, midtransStatus);

  // payment.status always tracks mappedStatus (unconditionally written) -- but
  // booking.paymentStatus is only ever advanced on finalizeSlot, so it must not be
  // part of this check for the transient/release/legitimate-terminal branches, or
  // idempotency would never converge for those statuses.
  if (paymentData.status !== decision.mappedStatus) {
    return false;
  }

  if (decision.finalizeSlot) {
    if (bookingData.paymentStatus !== decision.mappedStatus) return false;
    if (decision.resurrectBooking && bookingData.status !== 'pending') return false;
    const slotLockId = getSlotLockId(bookingData.barberId, bookingData.date, bookingData.startTime);
    const slotLockSnap = await db.collection('slotLocks').doc(slotLockId).get();
    const slotLockData = slotLockSnap.exists ? slotLockSnap.data() : null;
    return slotLockData?.status === 'finalized' && slotLockData?.bookingId === bookingId;
  }

  if (decision.releaseSlot) {
    if (bookingData.status !== 'cancelled') return false;
    const slotLockId = getSlotLockId(bookingData.barberId, bookingData.date, bookingData.startTime);
    const slotLockSnap = await db.collection('slotLocks').doc(slotLockId).get();
    return !slotLockSnap.exists;
  }

  return true;
}

export async function reconcileWebhookPayment(
  bookingId: string,
  _bookingData: Record<string, any>,
  _paymentData: Record<string, any>,
  midtransStatus: WebhookMidtransStatus,
  verifiedPaymentType: string | null,
  verifiedTransactionId: string | null
): Promise<ReconcileWebhookResult> {
  const { mappedStatus } = await reconcilePaymentTransaction(bookingId, {
    transaction_status: midtransStatus.transaction_status,
    fraud_status: midtransStatus.fraud_status,
    payment_type: verifiedPaymentType,
    transaction_id: verifiedTransactionId,
  });

  return { mappedStatus, applied: true };
}
