import * as crypto from 'crypto';

export function generateMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string | number,
  serverKey: string
): string {
  // Format grossAmount: if number or string, ensure standard string representation
  const amountStr = typeof grossAmount === 'number' ? grossAmount.toFixed(2) : String(grossAmount);
  // Midtrans signature formula: SHA512(order_id + status_code + gross_amount + ServerKey)
  // Note: Midtrans gross_amount in signature formula can be formatted without decimals or with decimals depending on notification format,
  // so we normalize both raw and decimal formats if needed.
  const payload = `${orderId}${statusCode}${amountStr}${serverKey}`;
  return crypto.createHash('sha512').update(payload).digest('hex');
}

export function verifyMidtransSignature(
  signatureKey: string,
  orderId: string,
  statusCode: string,
  grossAmount: string | number,
  serverKey: string
): boolean {
  if (!signatureKey || !orderId || !statusCode || grossAmount === undefined || !serverKey) {
    return false;
  }

  // Try raw string format
  const amountRawStr = String(grossAmount);
  const sig1 = crypto
    .createHash('sha512')
    .update(`${orderId}${statusCode}${amountRawStr}${serverKey}`)
    .digest('hex');

  if (sig1.toLowerCase() === signatureKey.toLowerCase()) {
    return true;
  }

  // Try formatted decimal (e.g. 50000.00)
  const numAmount = typeof grossAmount === 'number' ? grossAmount : parseFloat(String(grossAmount));
  if (!isNaN(numAmount)) {
    const sig2 = crypto
      .createHash('sha512')
      .update(`${orderId}${statusCode}${numAmount.toFixed(2)}${serverKey}`)
      .digest('hex');
    if (sig2.toLowerCase() === signatureKey.toLowerCase()) {
      return true;
    }
  }

  return false;
}
