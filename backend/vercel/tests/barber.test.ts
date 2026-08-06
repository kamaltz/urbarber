import { describe, expect, it } from 'vitest';

function validateStatusTransition(
  currentStatus: string,
  targetStatus: string,
  paymentStatus: string
): { allowed: boolean; errorCode?: string } {
  if (paymentStatus !== 'paid') {
    return { allowed: false, errorCode: 'PAYMENT_NOT_PAID' };
  }

  if (currentStatus === 'pending' && targetStatus === 'accepted') {
    return { allowed: true };
  }

  if (currentStatus === 'accepted' && targetStatus === 'in_progress') {
    return { allowed: true };
  }

  if (currentStatus === 'in_progress' && targetStatus === 'completed') {
    return { allowed: true };
  }

  return { allowed: false, errorCode: 'INVALID_STATUS_TRANSITION' };
}

describe('Barber Operations Transition Logic Unit Tests', () => {
  it('1. Allows accept transition when pending and paid', () => {
    const res = validateStatusTransition('pending', 'accepted', 'paid');
    expect(res.allowed).toBe(true);
  });

  it('2. Denies accept transition when pending and unpaid', () => {
    const res = validateStatusTransition('pending', 'accepted', 'pending');
    expect(res.allowed).toBe(false);
    expect(res.errorCode).toBe('PAYMENT_NOT_PAID');
  });

  it('3. Allows in_progress transition when accepted and paid', () => {
    const res = validateStatusTransition('accepted', 'in_progress', 'paid');
    expect(res.allowed).toBe(true);
  });

  it('4. Allows completed transition when in_progress and paid', () => {
    const res = validateStatusTransition('in_progress', 'completed', 'paid');
    expect(res.allowed).toBe(true);
  });

  it('5. Rejects invalid noncanonical transitions (e.g. pending -> completed)', () => {
    const res = validateStatusTransition('pending', 'completed', 'paid');
    expect(res.allowed).toBe(false);
    expect(res.errorCode).toBe('INVALID_STATUS_TRANSITION');
  });
});
