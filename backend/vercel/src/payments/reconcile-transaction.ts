/**
 * The single authoritative, transactional state mutation for payment reconciliation.
 *
 * Batch 09F-1B: replaces two independent write paths that could each leave
 * payments/{bookingId}, bookings/{bookingId}, and slotLocks/{slotId} inconsistent if
 * the process crashed or errored partway through a sequence of separate Firestore
 * calls:
 *  - reconcilePaymentSync (sync-reconciliation.ts) wrote booking -> slotLock ->
 *    (optionally) booking again -> payment as up to four separate network calls.
 *    A crash after the booking write but before the payment write left
 *    booking.paymentStatus='paid' while payments/{id}.status still showed the
 *    pre-sync value.
 *  - reconcileWebhookPayment (webhook-reconciliation.ts) used a Firestore
 *    transaction, but computed its decision from a booking/payment snapshot read
 *    OUTSIDE that transaction, then blind-wrote inside it. Under concurrent
 *    webhook+sync calls for the same order, that decision could already be stale by
 *    the time the transaction committed (a lost-update race), even though the write
 *    itself was atomic.
 *
 * This function fixes both: every read used to decide (payment, booking, slotLock)
 * happens INSIDE a single db.runTransaction callback, immediately followed by every
 * resulting write inside the same callback. Firestore guarantees the whole set of
 * reads+writes commits atomically (optimistic concurrency: if any read document
 * changed since it was read, Firestore retries the whole callback) or not at all --
 * so payments/{bookingId}, bookings/{bookingId} and slotLocks/{slotId} can never be
 * observed in a partially-updated state, and two concurrent callers (webhook + sync)
 * for the same order converge to one consistent result instead of racing.
 */
import { FieldValue, type Transaction } from 'firebase-admin/firestore';
import { getSlotLockId } from '../bookings/slot-lock.js';
import { db } from '../lib/firebase-admin.js';
import { voucherUserRedemptionDocId } from './voucher-service.js';
import { decideReconciliation, type ReconciliationDecision } from './reconciliation-decision.js';
import type { CanonicalPaymentStatus } from './status-mapper.js';

export interface ReconcileMidtransStatus {
  transaction_status?: string | null;
  fraud_status?: string | null;
  /** Falls back to the stored payment's paymentType/transactionId when omitted. */
  payment_type?: string | null;
  transaction_id?: string | null;
}

export interface ReconcileTransactionResult {
  mappedStatus: CanonicalPaymentStatus;
  decision: ReconciliationDecision;
}

export class ReconcileNotFoundError extends Error {
  constructor(bookingId: string) {
    super(`Payment or booking document not found for bookingId=${bookingId}`);
    this.name = 'ReconcileNotFoundError';
  }
}

/**
 * Reconciles bookingId against an authoritative Midtrans status inside one Firestore
 * transaction. Callers (webhook, sync) are responsible for their own
 * authentication/signature/ownership checks and for provider-status verification
 * (Get Status / signature) BEFORE calling this -- this function only owns the
 * Firestore state transition, which is the piece that must be atomic and shared.
 */
export async function reconcilePaymentTransaction(
  bookingId: string,
  midtransStatus: ReconcileMidtransStatus
): Promise<ReconcileTransactionResult> {
  const paymentRef = db.collection('payments').doc(bookingId);
  const bookingRef = db.collection('bookings').doc(bookingId);

  return db.runTransaction(async (t: Transaction) => {
    // All reads must happen before any write in a Firestore transaction. bookingData
    // is needed first to compute the slot lock id, so read payment+booking, then the
    // slot lock they identify.
    const [paymentSnap, bookingSnap] = await Promise.all([t.get(paymentRef), t.get(bookingRef)]);

    if (!paymentSnap.exists || !bookingSnap.exists) {
      throw new ReconcileNotFoundError(bookingId);
    }

    const paymentData = paymentSnap.data() || {};
    const bookingData = bookingSnap.data() || {};

    const slotLockId = getSlotLockId(bookingData.barberId, bookingData.date, bookingData.startTime);
    const slotLockRef = db.collection('slotLocks').doc(slotLockId);
    const slotLockSnap = await t.get(slotLockRef);
    const slotLockData = slotLockSnap.exists ? slotLockSnap.data() : null;

    // Decision is derived from data read INSIDE this transaction -- never from a
    // caller-supplied snapshot -- so it reflects the latest committed state even
    // under concurrent webhook+sync calls.
    const decision = decideReconciliation(bookingData, paymentData, midtransStatus);
    const { mappedStatus } = decision;

    // Voucher redemption finalizes exactly once, on the payment's first paid
    // transition (the same !paymentData.paidAt guard that protects paidAt
    // itself from double-stamping below) -- this is the spec's required
    // "payment paid transition is the authoritative redemption point". All
    // reads must happen before any write in this transaction, so resolve them
    // here even though they're only used further down.
    const voucherCode: string | undefined = paymentData.voucherCode;
    const shouldFinalizeVoucher = decision.finalizeSlot && !paymentData.paidAt && !!voucherCode;

    const voucherRef = shouldFinalizeVoucher ? db.collection('vouchers').doc(voucherCode!) : null;
    const voucherUserRedemptionRef = shouldFinalizeVoucher
      ? db.collection('voucherUserRedemptions').doc(voucherUserRedemptionDocId(voucherCode!, bookingData.customerId))
      : null;
    const voucherRedemptionRef = shouldFinalizeVoucher ? db.collection('voucherRedemptions').doc(bookingId) : null;

    let voucherData: FirebaseFirestore.DocumentData | undefined;
    let voucherUserRedemptionCount = 0;
    let voucherAlreadyRedeemed = false;

    if (shouldFinalizeVoucher) {
      const [voucherSnap, voucherUserRedemptionSnap, voucherRedemptionSnap] = await Promise.all([
        t.get(voucherRef!),
        t.get(voucherUserRedemptionRef!),
        t.get(voucherRedemptionRef!),
      ]);
      voucherData = voucherSnap.exists ? voucherSnap.data() : undefined;
      voucherUserRedemptionCount = voucherUserRedemptionSnap.exists ? (voucherUserRedemptionSnap.data()?.count ?? 0) : 0;
      // Defense-in-depth only: unreachable in practice since the !paymentData.paidAt
      // guard already prevents this transaction from running a second time for the
      // same payment, but a free extra read inside a transaction that's already here.
      voucherAlreadyRedeemed = voucherRedemptionSnap.exists;
    }

    const timestamp = new Date().toISOString();

    const updatePayment: Record<string, any> = {
      status: mappedStatus,
      transactionStatus: midtransStatus.transaction_status ?? null,
      fraudStatus: midtransStatus.fraud_status || paymentData.fraudStatus || null,
      paymentType: midtransStatus.payment_type || paymentData.paymentType || null,
      transactionId: midtransStatus.transaction_id || paymentData.transactionId || null,
      updatedAt: timestamp,
      lastReconciledAt: timestamp,
    };

    // booking.paymentStatus is only ever advanced on a terminal, confirmed-paid
    // outcome (finalizeSlot). A transient status (challenge / missing-fraud capture,
    // both map to 'pending') must never overwrite an existing paymentStatus, or an
    // already-paid booking would be destructively downgraded by an incomplete read.
    // The release branch leaves paymentStatus untouched too -- booking.status is set
    // to 'cancelled' there, which is what actually gates barber acceptance.
    const updateBooking: Record<string, any> = {
      updatedAt: timestamp,
    };

    if (decision.finalizeSlot) {
      updateBooking.paymentStatus = mappedStatus;

      if (!paymentData.paidAt) {
        updatePayment.paidAt = timestamp;
        updateBooking.paidAt = timestamp;

        if (shouldFinalizeVoucher && !voucherAlreadyRedeemed && voucherData) {
          const usageLimit: number | undefined = voucherData.usageLimit;
          const perUserLimit: number | undefined = voucherData.perUserLimit;
          const currentUsageCount: number = voucherData.usageCount ?? 0;
          const countedTowardLimit =
            (usageLimit === undefined || currentUsageCount < usageLimit) &&
            (perUserLimit === undefined || voucherUserRedemptionCount < perUserLimit);

          t.set(voucherRedemptionRef!, {
            bookingId,
            voucherCode,
            customerId: bookingData.customerId,
            discountAmount: paymentData.voucherDiscount ?? 0,
            countedTowardLimit,
            redeemedAt: timestamp,
          });

          if (countedTowardLimit) {
            t.update(voucherRef!, { usageCount: FieldValue.increment(1) });
            t.set(voucherUserRedemptionRef!, { count: FieldValue.increment(1) }, { merge: true });
          }
        }
      }

      // A finalized lock already owned by a DIFFERENT bookingId means another
      // booking already holds this exact slot as a paid, final booking -- this
      // should be prevented up front by the transactional slot-lock acquisition in
      // payments.ts, but as defense-in-depth this transaction must never steal an
      // already-finalized lock out from under the booking that legitimately holds
      // it (P0-1: CRITICAL slot ownership race). The payment record still reflects
      // that money was genuinely received (audit trail preserved), but this
      // booking does not get the slot: fail safe by marking it cancelled with
      // refundRequired, mirroring the existing paid-then-rejected/cancelled
      // pattern (api/app.ts), so it surfaces for manual admin refund instead of
      // silently creating duplicate slot ownership. Setting refundRequired also
      // satisfies decideReconciliation's legitimate-cancellation evidence gate, so
      // a duplicate/delayed webhook or sync retry for this same booking can never
      // re-attempt stealing the lock (isLegitimateTerminalState short-circuits).
      const hasConflictingFinalizedLock =
        !!slotLockData && slotLockData.status === 'finalized' && slotLockData.bookingId !== bookingId;

      if (hasConflictingFinalizedLock) {
        updateBooking.status = 'cancelled';
        updateBooking.refundRequired = true;
      } else {
        if (!slotLockData || slotLockData.status !== 'finalized' || slotLockData.bookingId !== bookingId) {
          t.set(
            slotLockRef,
            {
              barberId: bookingData.barberId,
              date: bookingData.date,
              startTime: bookingData.startTime,
              customerId: bookingData.customerId,
              status: 'finalized',
              bookingId,
              finalizedAt: timestamp,
            },
            { merge: true }
          );
        }

        if (decision.resurrectBooking) {
          updateBooking.status = 'pending';
        }
      }
    } else if (decision.releaseSlot) {
      updateBooking.status = 'cancelled';
      t.delete(slotLockRef);
    }

    t.update(paymentRef, updatePayment);
    t.update(bookingRef, updateBooking);

    return { mappedStatus, decision };
  });
}
