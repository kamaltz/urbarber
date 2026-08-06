import { defineSecret } from 'firebase-functions/params';

export const midtransServerKey = defineSecret('MIDTRANS_SERVER_KEY');
export const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';

export function getMidtransServerKey(): string {
  const secretVal = midtransServerKey.value();
  if (secretVal && secretVal.trim().length > 0) {
    return secretVal.trim();
  }
  const envVal = process.env.MIDTRANS_SERVER_KEY;
  if (envVal && envVal.trim().length > 0) {
    return envVal.trim();
  }
  // Safe default for testing / emulator if secret is unpopulated
  return 'SB-Mid-server-TEST_KEY';
}
