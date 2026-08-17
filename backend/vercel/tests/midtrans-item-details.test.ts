import { describe, expect, it } from 'vitest';
import { buildMidtransItemDetails, calculatePricing, type BookingPricingSettings } from '../src/payments/pricing-calculator.js';

/**
 * sum(item_details.price * quantity) === grossAmount for every pricing
 * combination -- Midtrans requires transaction_details.gross_amount to
 * exactly equal the item_details total, or Snap silently mismatches.
 */
describe('buildMidtransItemDetails / gross_amount parity', () => {
  const cases: Array<{ name: string; settings: BookingPricingSettings; bookingType: 'home' | 'onsite'; distanceKm: number | null }> = [
    {
      name: 'onsite, no fees',
      settings: {
        applicationFee: { enabled: false, mode: 'fixed', fixedAmount: 0 },
        homeServiceFee: { enabled: false, mode: 'fixed', fixedAmount: 0 },
      },
      bookingType: 'onsite',
      distanceKm: null,
    },
    {
      name: 'home fixed fee + fixed app fee',
      settings: {
        applicationFee: { enabled: true, mode: 'fixed', fixedAmount: 2000 },
        homeServiceFee: { enabled: true, mode: 'fixed', fixedAmount: 10000 },
      },
      bookingType: 'home',
      distanceKm: 3,
    },
    {
      name: 'home distance fee + percentage app fee',
      settings: {
        applicationFee: { enabled: true, mode: 'percentage', percentage: 5, minimumAmount: 1000 },
        homeServiceFee: { enabled: true, mode: 'distance', baseAmount: 3000, includedDistanceKm: 1, perKmAmount: 1500 },
      },
      bookingType: 'home',
      distanceKm: 9.4,
    },
  ];

  for (const testCase of cases) {
    it(`${testCase.name}: item_details sum equals grossAmount`, () => {
      const breakdown = calculatePricing({
        serviceBasePrice: 75000,
        bookingType: testCase.bookingType,
        tipAmountInput: 5000,
        voucher: { code: 'TEST10', discountType: 'fixed', discountValue: 10000 },
        distanceKm: testCase.distanceKm,
        barberMaxDistanceKm: null,
        settings: testCase.settings,
      });

      const items = buildMidtransItemDetails(breakdown, 'svc-1', 'Layanan Test');
      const itemsSum = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

      expect(itemsSum).toBe(breakdown.grossAmount);
      // No negative-price line items -- the voucher discount must always be
      // folded into the base line, never emitted as its own negative row.
      expect(items.every((item) => item.price >= 0)).toBe(true);
    });
  }

  it('omits zero-amount fee lines entirely', () => {
    const breakdown = calculatePricing({
      serviceBasePrice: 50000,
      bookingType: 'onsite',
      tipAmountInput: 0,
      voucher: null,
      distanceKm: null,
      barberMaxDistanceKm: null,
      settings: {
        applicationFee: { enabled: false, mode: 'fixed', fixedAmount: 0 },
        homeServiceFee: { enabled: false, mode: 'fixed', fixedAmount: 0 },
      },
    });

    const items = buildMidtransItemDetails(breakdown, 'svc-1', 'Layanan Test');
    expect(items).toHaveLength(1);
    expect(items[0].price).toBe(50000);
  });
});
