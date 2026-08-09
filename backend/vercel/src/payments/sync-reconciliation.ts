/**
 * Payment sync reconciliation -- the core logic shared by POST /api/payments/sync.
 * Extracted from api/payments.ts so this payment-critical path is directly
 * unit-testable against the Firestore emulator (matching the convention used by
 * src/bookings/availability.ts and src/admin/admin.service.ts).
 */
import { getSlotLockId } from '../bookings/slot-lock.js';
import { db } from '../lib/firebase-admin.js';
import { type CanonicalPaymentStatus, mapMidtransStatus, shouldReleaseSlot } from './status-mapper.js';

export interface MidtransStatusResponse {
  transaction_status: string;
  fraud_status?: string | null;
  transaction_id?: string | null;
  payment_type?: string | null;
}

export interface ReconcileSyncResult {
  mappedStatus: CanonicalPaymentStatus;
}

/**
 * Reconciles a booking/payment pair against an authoritative Midtrans Get Status
 * response.
 *
 * Batch 09E-P0 incident: a genuinely paid transaction (transaction_status=capture,
 * fraud_status=accept) was destructively cancelled by a prior version of this logic
 * because fraud_status was never passed into mapMidtransStatus, so every 'capture'
 * fell through to the mapper's destructive default. This function always passes
 * fraud_status through (see status-mapper.ts for the non-destructive default), and
 * additionally:
 *  - finalizes the slot lock when confirming 'paid' if it is missing or not yet
 *    finalized (covers sync being the first caller to observe payment, and recovers
 *    a lock that a prior bug may have deleted);
 *  - restores booking.status from 'cancelled' back to 'pending' ONLY when there is no
 *    evidence of a legitimate cancellation (handleCancelBooking always stamps
 *    cancelledAt + cancellationReason, and flags refundRequired when the payment was
 *    already paid). A genuinely cancelled paid booking is left untouched -- it is
 *    never resurrected.
 */
export async function reconcilePaymentSync(
  bookingId: string,
  bookingData: Record<string, any>,
  paymentData: Record<string, any>,
  midtransStatus: MidtransStatusResponse
): Promise<ReconcileSyncResult> {
  const mappedStatus = mapMidtransStatus(midtransStatus.transaction_status, midtransStatus.fraud_status);

  const paymentRef = db.collection('payments').doc(bookingId);
  const bookingRef = db.collection('bookings').doc(bookingId);

  const timestamp = new Date().toISOString();
  const updateData: Record<string, any> = {
    status: mappedStatus,
    transactionStatus: midtransStatus.transaction_status,
    fraudStatus: midtransStatus.fraud_status || paymentData.fraudStatus || null,
    transactionId: midtransStatus.transaction_id || paymentData.transactionId || null,
    updatedAt: timestamp,
  };

  if (mappedStatus === 'paid') {
    updateData.paidAt = timestamp;

    // Update booking with payment status (payment-first principle)
    // Booking stays 'pending' until barber accepts it
    await bookingRef.update({ paymentStatus: 'paid', updatedAt: timestamp });

    // handleCancelBooking (the only real cancel path, customer or admin) always
    // stamps cancelledAt + cancellationReason, and flags refundRequired when the
    // payment was already paid. A 'cancelled' booking bearing NONE of those markers
    // was never legitimately cancelled -- it can only be the pre-fix sync bug that
    // wrongly cancelled an already-paid booking. Absence of the markers is the
    // evidence gate for BOTH corrections below: a legitimately cancelled booking
    // (refund owed) must keep its released slot and cancelled status untouched, even
    // though Midtrans still reports the underlying charge as captured.
    const isLegitimateCancellation =
      bookingData.status === 'cancelled' &&
      Boolean(bookingData.cancelledAt || bookingData.cancellationReason || bookingData.refundRequired);
    const isSyncBugCancellation = bookingData.status === 'cancelled' && !isLegitimateCancellation;

    if (!isLegitimateCancellation) {
      // Ensure the slot lock reflects finalized ownership. The webhook is the primary
      // finalization path; this covers cases where sync is the first/only caller to
      // observe a confirmed payment (webhook not yet delivered, or recovering from the
      // pre-fix fraud_status bug that could delete an already-finalized lock).
      const slotLockId = getSlotLockId(bookingData.barberId, bookingData.date, bookingData.startTime);
      const slotLockRef = db.collection('slotLocks').doc(slotLockId);
      const slotLockSnap = await slotLockRef.get();
      if (!slotLockSnap.exists || slotLockSnap.data()?.status !== 'finalized') {
        await slotLockRef.set(
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

      if (isSyncBugCancellation) {
        await bookingRef.update({ status: 'pending', updatedAt: timestamp });
      }
    }
  } else if (shouldReleaseSlot(mappedStatus)) {
    // Release slot for cancelled/expired payments
    const slotLockId = getSlotLockId(bookingData.barberId, bookingData.date, bookingData.startTime);
    await db.collection('slotLocks').doc(slotLockId).delete();
    await bookingRef.update({ status: 'cancelled', updatedAt: timestamp });
  }

  await paymentRef.update(updateData);

  return { mappedStatus };
}
