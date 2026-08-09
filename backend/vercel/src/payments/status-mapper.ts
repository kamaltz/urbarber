export type CanonicalPaymentStatus =
  | 'initiated'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'expired'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded';

export function mapMidtransStatus(
  transactionStatus?: string | null,
  fraudStatus?: string | null
): CanonicalPaymentStatus {
  if (!transactionStatus) return 'pending';

  const status = transactionStatus.toLowerCase().trim();
  const fraud = (fraudStatus || '').toLowerCase().trim();

  switch (status) {
    case 'pending':
    case 'authorize':
      return 'pending';
    case 'settlement':
      return 'paid';
    case 'capture':
      if (fraud === 'accept') return 'paid';
      if (fraud === 'challenge') return 'pending';
      if (fraud === 'deny') return 'failed';
      // Unknown/missing fraud_status on a capture (e.g. an incomplete reconciliation
      // read) is NOT a definitive verdict. Treating it as 'failed' would destructively
      // cancel/release an already-paid booking on any incomplete input. Fall back to
      // the same safe, non-destructive state used for 'challenge' until a definitive
      // fraud verdict is available.
      return 'pending';
    case 'deny':
    case 'failure':
      return 'failed';
    case 'cancel':
      return 'cancelled';
    case 'expire':
      return 'expired';
    case 'refund':
      return 'refunded';
    case 'partial_refund':
      return 'partially_refunded';
    default:
      return 'pending';
  }
}

export function shouldReleaseSlot(paymentStatus: CanonicalPaymentStatus): boolean {
  return (
    paymentStatus === 'failed' ||
    paymentStatus === 'expired' ||
    paymentStatus === 'cancelled' ||
    paymentStatus === 'refunded'
  );
}
