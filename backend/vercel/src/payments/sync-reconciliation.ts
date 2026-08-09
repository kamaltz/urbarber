/**
 * Payment sync reconciliation -- the core logic shared by POST /api/payments/sync.
 * Extracted from api/payments.ts so this payment-critical path is directly
 * unit-testable against the Firestore emulator (matching the convention used by
 * src/bookings/availability.ts and src/admin/admin.service.ts).
 *
 * Batch 09F-1B: this is now a thin wrapper around reconcilePaymentTransaction
 * (reconcile-transaction.ts), the single atomic state-transition core shared with
 * the webhook (see webhook-reconciliation.ts). The previous version performed up to
 * four separate sequential Firestore writes (booking -> slotLock -> booking again ->
 * payment); a crash between any two of them could leave payments/{bookingId} and
 * bookings/{bookingId} inconsistent. reconcilePaymentTransaction reads and writes
 * all three documents (payment, booking, slotLock) inside one Firestore transaction,
 * so that can no longer happen.
 */
import { reconcilePaymentTransaction } from './reconcile-transaction.js';
import type { CanonicalPaymentStatus } from './status-mapper.js';

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
 * Reconciles bookingId against an authoritative Midtrans Get Status response.
 * bookingId is the only input that matters for the mutation -- the current
 * payment/booking/slotLock state is always read fresh inside the transaction, never
 * from a caller-supplied snapshot, so this stays correct under concurrent webhook
 * calls for the same order (see reconcile-transaction.ts).
 */
export async function reconcilePaymentSync(
  bookingId: string,
  _bookingData: Record<string, any>,
  _paymentData: Record<string, any>,
  midtransStatus: MidtransStatusResponse
): Promise<ReconcileSyncResult> {
  const { mappedStatus } = await reconcilePaymentTransaction(bookingId, midtransStatus);
  return { mappedStatus };
}
