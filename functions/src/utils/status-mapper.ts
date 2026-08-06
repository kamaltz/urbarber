export type PaymentStatus =
  | 'initiated'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'expired'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded';

export function mapMidtransStatus(
  transactionStatus?: string,
  fraudStatus?: string
): PaymentStatus {
  if (!transactionStatus) return 'pending';

  const status = transactionStatus.toLowerCase().trim();
  const fraud = (fraudStatus || '').toLowerCase().trim();

  switch (status) {
    case 'pending':
      return 'pending';

    case 'settlement':
      return 'paid';

    case 'capture':
      return fraud === 'accept' ? 'paid' : 'failed';

    case 'deny':
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

export function shouldReleaseSlot(paymentStatus: PaymentStatus): boolean {
  return paymentStatus === 'failed' || paymentStatus === 'expired' || paymentStatus === 'cancelled';
}
