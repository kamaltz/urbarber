/**
 * Batch 09F-1 (P1_SYNC_UNOPENED_SNAP_500): classifies a thrown midtrans-client error
 * from Snap's Get Status API as "transaction not yet recognized by Midtrans" --
 * the expected shape when a customer syncs before completing a payment attempt on a
 * freshly created Snap order (see node_modules/midtrans-client/lib/httpClient.js,
 * which surfaces Midtrans's own `status_code` as `httpStatusCode` on the thrown
 * MidtransError, and puts `status_message` on `ApiResponse`).
 */
export function isUnrecognizedTransactionError(err: unknown): boolean {
  const httpStatusCode = Number((err as any)?.httpStatusCode);
  const apiMessage = String((err as any)?.ApiResponse?.status_message || (err as any)?.message || '');
  return httpStatusCode === 404 || /doesn'?t exist/i.test(apiMessage);
}
