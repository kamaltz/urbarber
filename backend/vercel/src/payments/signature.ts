import crypto from 'crypto';

export function generateMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: number | string,
  serverKey: string
): string {
  const amountStr = typeof grossAmount === 'number' ? grossAmount.toFixed(2) : String(grossAmount);
  return crypto.createHash('sha512').update(`${orderId}${statusCode}${amountStr}${serverKey}`).digest('hex');
}

export function verifyMidtransSignature(
  signatureKey: string,
  orderId: string,
  statusCode: string,
  grossAmount: number | string,
  serverKey: string
): boolean {
  if (!signatureKey || !orderId || !statusCode || grossAmount === undefined || !serverKey) {
    return false;
  }

  const amountRawStr = String(grossAmount);
  const sig1 = crypto.createHash('sha512').update(`${orderId}${statusCode}${amountRawStr}${serverKey}`).digest('hex');
  if (sig1.toLowerCase() === signatureKey.toLowerCase()) return true;

  const numAmount = typeof grossAmount === 'number' ? grossAmount : parseFloat(String(grossAmount));
  if (!isNaN(numAmount)) {
    const sig2 = crypto.createHash('sha512').update(`${orderId}${statusCode}${numAmount.toFixed(2)}${serverKey}`).digest('hex');
    if (sig2.toLowerCase() === signatureKey.toLowerCase()) return true;
  }

  return false;
}

export function parseOrderId(orderId: string): { valid: boolean; bookingId: string | null } {
  if (!orderId || typeof orderId !== 'string' || !orderId.startsWith('URB-')) {
    return { valid: false, bookingId: null };
  }
  const bookingId = orderId.substring(4).trim();
  return { valid: bookingId.length > 0, bookingId };
}
