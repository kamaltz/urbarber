/**
 * Batch 10B-5H-A: authoritative "paid" can arrive from two independent sources --
 * the realtime Firestore payment subscription and the sync-status response -- and
 * either may fire while the other is in flight. Checkout must navigate to Active
 * Booking exactly once no matter which source reports paid first, or if both do.
 */
import type { PaymentStatus } from '@/types/domain';

export interface PaidCheckoutGuard {
  /** True once a "paid" signal has already been consumed. */
  readonly hasNavigated: boolean;
  /**
   * Reports a status observed from either signal source. Returns true only the
   * first time an authoritative "paid" status is observed; every other status,
   * and every call after the first paid, returns false.
   */
  consumeIfPaid(status: PaymentStatus | null | undefined): boolean;
}

export function createPaidCheckoutGuard(): PaidCheckoutGuard {
  let navigated = false;
  return {
    get hasNavigated() {
      return navigated;
    },
    consumeIfPaid(status) {
      if (navigated || status !== 'paid') return false;
      navigated = true;
      return true;
    },
  };
}
