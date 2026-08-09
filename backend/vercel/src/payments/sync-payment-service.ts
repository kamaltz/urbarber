/**
 * Batch 09F-1B: service-level extraction of POST /api/payments/sync's Midtrans
 * query + reconciliation logic, decoupled from HTTP/auth concerns (those stay in
 * api/payments.ts's handleSyncPayment). Extracted so the P1_SYNC_UNOPENED_SNAP_500
 * fix -- Midtrans's Get Status API rejecting a not-yet-opened Snap transaction with
 * "Transaction doesn't exist" must surface as a controlled non-error response, never
 * a reconciliation transaction -- is directly testable end-to-end (mocking only the
 * Midtrans SDK), not just at the error-classifier unit level.
 */
import { config } from '../config/index.js';
import { isUnrecognizedTransactionError } from './midtrans-error.js';
import { reconcilePaymentSync } from './sync-reconciliation.js';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const midtransClient = require('midtrans-client');

export class SyncInvalidStateError extends Error {}

export interface SyncPaymentServiceResult {
  success: true;
  paymentStatus: string;
  transactionStatus: string | null;
  message: string;
}

export interface MidtransStatusClient {
  transaction: {
    status: (orderId: string) => Promise<any>;
  };
}

function defaultSnapClient(): MidtransStatusClient {
  return new midtransClient.Snap({
    isProduction: config.midtransIsProduction || false,
    serverKey: config.midtransServerKey,
  });
}

/**
 * Queries Midtrans's authoritative status for bookingId's payment and reconciles it.
 * Throws SyncInvalidStateError if no orderId is recorded (caller maps to 400); any
 * other thrown error is a genuine gateway/unexpected failure the caller maps to 500.
 *
 * snapClient is injectable (defaults to a real midtrans-client Snap instance) purely
 * so tests can exercise this function end-to-end against a fake Midtrans response
 * (e.g. the "Transaction doesn't exist" 404 shape) without depending on module-mock
 * interop with a require()'d CJS package.
 */
export async function syncPaymentStatusService(
  bookingId: string,
  bookingData: Record<string, any>,
  paymentData: Record<string, any>,
  snapClient: MidtransStatusClient = defaultSnapClient()
): Promise<SyncPaymentServiceResult> {
  // Snap's createTransaction never returns a transaction_id (only Midtrans assigns
  // one once a payment attempt occurs), so orderId -- known from creation, and
  // accepted by Midtrans's Get Status API just like transaction_id -- is the
  // reliable lookup key here (matches the webhook's reconciliation, which also
  // queries by orderId).
  const orderId = paymentData.orderId || paymentData.transactionId;
  if (!orderId) {
    throw new SyncInvalidStateError('Order ID tidak ditemukan.');
  }

  let midtransStatus;
  try {
    midtransStatus = await snapClient.transaction.status(orderId);
  } catch (statusErr: any) {
    // If the customer syncs before Midtrans has recognized/opened the Snap
    // transaction (no payment attempt yet), Get Status rejects with "Transaction
    // doesn't exist" -- a normal not-yet-known state, not a provider-reported
    // failure. Surface it as the existing canonical status instead of an error, and
    // do not touch booking/slot state at all (no reconciliation transaction runs).
    if (isUnrecognizedTransactionError(statusErr)) {
      return {
        success: true,
        paymentStatus: paymentData.status || 'initiated',
        transactionStatus: null,
        message: 'Transaksi belum dikenali oleh Midtrans. Selesaikan pembayaran untuk melanjutkan.',
      };
    }

    throw statusErr;
  }

  const { mappedStatus } = await reconcilePaymentSync(bookingId, bookingData, paymentData, midtransStatus);

  return {
    success: true,
    paymentStatus: mappedStatus,
    transactionStatus: midtransStatus.transaction_status,
    message: 'Status pembayaran berhasil disinkronkan',
  };
}
