/**
 * Final E2E Hotfix P0 (Symptom B): a valid pending Midtrans transaction with a
 * paymentUrl must remain payable. Status alone never disables the button --
 * only a missing paymentUrl, an in-flight sync, or a terminal status does.
 */
import type { PaymentStatus } from '@/types/domain';

const TERMINAL_STATUSES: PaymentStatus[] = ['paid', 'expired', 'cancelled', 'failed'];

export function isPayButtonDisabled(params: {
  status: PaymentStatus;
  paymentUrl: string | null | undefined;
  syncing: boolean;
}): boolean {
  if (TERMINAL_STATUSES.includes(params.status)) return true;
  if (params.syncing) return true;
  return !params.paymentUrl;
}
