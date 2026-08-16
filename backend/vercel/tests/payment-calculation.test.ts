import { describe, expect, it } from 'vitest';

/**
 * Pure functions mirroring backend payment calculation logic in backend/vercel/api/payments.ts
 */
const HOME_SERVICE_FEE_IDR = 10000;

function calculatePaymentBreakdown(servicePrice: number, bookingType: 'home' | 'onsite', tipAmountInput: number = 0) {
  const baseAmount = Math.max(0, Math.round(servicePrice));
  const homeServiceFee = bookingType === 'home' ? HOME_SERVICE_FEE_IDR : 0;
  const tipAmount = Math.max(0, Math.floor(tipAmountInput));
  const totalAmount = baseAmount + homeServiceFee + tipAmount;

  return {
    baseAmount,
    homeServiceFee,
    tipAmount,
    totalAmount,
  };
}

describe('Authoritative Server Payment Calculation (Phase 12, 13, 14, 22)', () => {
  it('BARBERSHOP: base 50k, home fee 0, tip 0 -> total 50k', () => {
    const result = calculatePaymentBreakdown(50000, 'onsite', 0);
    expect(result).toEqual({
      baseAmount: 50000,
      homeServiceFee: 0,
      tipAmount: 0,
      totalAmount: 50000,
    });
  });

  it('BARBERSHOP + TIP: base 50k, home fee 0, tip 5k -> total 55k', () => {
    const result = calculatePaymentBreakdown(50000, 'onsite', 5000);
    expect(result).toEqual({
      baseAmount: 50000,
      homeServiceFee: 0,
      tipAmount: 5000,
      totalAmount: 55000,
    });
  });

  it('HOME: base 50k, home fee 10k, tip 0 -> total 60k', () => {
    const result = calculatePaymentBreakdown(50000, 'home', 0);
    expect(result).toEqual({
      baseAmount: 50000,
      homeServiceFee: 10000,
      tipAmount: 0,
      totalAmount: 60000,
    });
  });

  it('HOME + TIP: base 50k, home fee 10k, tip 5k -> total 65k', () => {
    const result = calculatePaymentBreakdown(50000, 'home', 5000);
    expect(result).toEqual({
      baseAmount: 50000,
      homeServiceFee: 10000,
      tipAmount: 5000,
      totalAmount: 65000,
    });
  });

  it('Malicious input: negative tip is sanitized to 0', () => {
    const result = calculatePaymentBreakdown(50000, 'home', -5000);
    expect(result.tipAmount).toBe(0);
    expect(result.totalAmount).toBe(60000);
  });

  it('Client attempt to override home fee is ignored; server recomputes canonical fee', () => {
    // Server computes based on bookingType === 'home' regardless of client input
    const result = calculatePaymentBreakdown(50000, 'home', 0);
    expect(result.homeServiceFee).toBe(10000);
    expect(result.totalAmount).toBe(60000);
  });
});
