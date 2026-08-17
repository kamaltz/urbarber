import { describe, expect, it } from 'vitest';
import {
  calculatePricing,
  HomeServiceLocationRequiredError,
  HomeServiceOutOfRangeError,
  type BookingPricingSettings,
} from '../src/payments/pricing-calculator.js';

/**
 * Exercises the actual canonical calculator (backend/vercel/src/payments/pricing-calculator.ts)
 * directly -- not a hand-mirrored copy of its logic. FINAL_THESIS_READINESS_AUDIT.md
 * flagged the previous version of this file as a drift risk for exactly that reason.
 */

const NO_FEES: BookingPricingSettings = {
  applicationFee: { enabled: false, mode: 'fixed', fixedAmount: 0 },
  homeServiceFee: { enabled: false, mode: 'fixed', fixedAmount: 0 },
};

const HOME_FIXED_10K: BookingPricingSettings = {
  applicationFee: { enabled: false, mode: 'fixed', fixedAmount: 0 },
  homeServiceFee: { enabled: true, mode: 'fixed', fixedAmount: 10000 },
};

describe('calculatePricing', () => {
  it('A. onsite, no voucher, no tip, fixed app fee 2k -> total 52k', () => {
    const result = calculatePricing({
      serviceBasePrice: 50000,
      bookingType: 'onsite',
      tipAmountInput: 0,
      voucher: null,
      distanceKm: null,
      barberMaxDistanceKm: null,
      settings: {
        applicationFee: { enabled: true, mode: 'fixed', fixedAmount: 2000 },
        homeServiceFee: { enabled: false, mode: 'fixed', fixedAmount: 0 },
      },
    });
    expect(result.grossAmount).toBe(52000);
    expect(result.homeServiceFee).toBe(0);
    expect(result.applicationFee).toBe(2000);
  });

  it('B. home fixed fee 10k, app fee 2k, no voucher, tip 5k -> total 67k', () => {
    const result = calculatePricing({
      serviceBasePrice: 50000,
      bookingType: 'home',
      tipAmountInput: 5000,
      voucher: null,
      distanceKm: 3,
      barberMaxDistanceKm: null,
      settings: {
        applicationFee: { enabled: true, mode: 'fixed', fixedAmount: 2000 },
        homeServiceFee: { enabled: true, mode: 'fixed', fixedAmount: 10000 },
      },
    });
    expect(result.grossAmount).toBe(67000);
  });

  it('C. voucher fixed 10k, home fee 10k, app fee 2k, tip 5k -> total 57k', () => {
    const result = calculatePricing({
      serviceBasePrice: 50000,
      bookingType: 'home',
      tipAmountInput: 5000,
      voucher: { code: 'HEMAT10K', discountType: 'fixed', discountValue: 10000 },
      distanceKm: 3,
      barberMaxDistanceKm: null,
      settings: {
        applicationFee: { enabled: true, mode: 'fixed', fixedAmount: 2000 },
        homeServiceFee: { enabled: true, mode: 'fixed', fixedAmount: 10000 },
      },
    });
    expect(result.baseAmount).toBe(50000);
    expect(result.voucherDiscount).toBe(10000);
    expect(result.discountedBaseAmount).toBe(40000);
    expect(result.grossAmount).toBe(57000);
  });

  it('D. percentage voucher never discounts app fee, home fee, or tip', () => {
    const result = calculatePricing({
      serviceBasePrice: 100000,
      bookingType: 'home',
      tipAmountInput: 5000,
      voucher: { code: 'HEMAT10PCT', discountType: 'percentage', discountValue: 10 },
      distanceKm: 2,
      barberMaxDistanceKm: null,
      settings: {
        applicationFee: { enabled: true, mode: 'fixed', fixedAmount: 3000 },
        homeServiceFee: { enabled: true, mode: 'fixed', fixedAmount: 10000 },
      },
    });
    expect(result.voucherDiscount).toBe(10000); // 10% of 100000
    expect(result.homeServiceFee).toBe(10000); // untouched
    expect(result.applicationFee).toBe(3000); // untouched
    expect(result.tipAmount).toBe(5000); // untouched
    expect(result.grossAmount).toBe(90000 + 10000 + 3000 + 5000);
  });

  it('E. percentage application fee calculates correctly (on post-voucher base)', () => {
    const result = calculatePricing({
      serviceBasePrice: 100000,
      bookingType: 'onsite',
      tipAmountInput: 0,
      voucher: { code: 'HEMAT20K', discountType: 'fixed', discountValue: 20000 },
      distanceKm: null,
      barberMaxDistanceKm: null,
      settings: {
        applicationFee: { enabled: true, mode: 'percentage', percentage: 5 },
        homeServiceFee: { enabled: false, mode: 'fixed', fixedAmount: 0 },
      },
    });
    // discountedBaseAmount = 80000, 5% = 4000
    expect(result.applicationFee).toBe(4000);
    expect(result.grossAmount).toBe(80000 + 4000);
  });

  it('F. home distance mode calculates correct fee', () => {
    const result = calculatePricing({
      serviceBasePrice: 50000,
      bookingType: 'home',
      tipAmountInput: 0,
      voucher: null,
      distanceKm: 7.2,
      barberMaxDistanceKm: null,
      settings: {
        applicationFee: { enabled: false, mode: 'fixed', fixedAmount: 0 },
        homeServiceFee: {
          enabled: true,
          mode: 'distance',
          baseAmount: 5000,
          includedDistanceKm: 2,
          perKmAmount: 1000,
          maxServiceDistanceKm: 20,
        },
      },
    });
    // chargeableKm = max(0, 7.2 - 2) = 5.2 -> ceil = 6 -> fee = 5000 + 6*1000 = 11000
    expect(result.homeServiceFee).toBe(11000);
    expect(result.homeServiceFeeMode).toBe('distance');
    expect(result.homeServiceFeeDistanceKm).toBe(7.2);
  });

  it('G. outside max service distance is rejected (settings cap)', () => {
    expect(() =>
      calculatePricing({
        serviceBasePrice: 50000,
        bookingType: 'home',
        tipAmountInput: 0,
        voucher: null,
        distanceKm: 25,
        barberMaxDistanceKm: null,
        settings: {
          ...HOME_FIXED_10K,
          homeServiceFee: { ...HOME_FIXED_10K.homeServiceFee, maxServiceDistanceKm: 20 },
        },
      })
    ).toThrow(HomeServiceOutOfRangeError);
  });

  it('G2. radius cap applies even when home fee mode is fixed (not just distance mode)', () => {
    expect(() =>
      calculatePricing({
        serviceBasePrice: 50000,
        bookingType: 'home',
        tipAmountInput: 0,
        voucher: null,
        distanceKm: 12,
        barberMaxDistanceKm: 10, // barber's own configured radius, tighter than settings
        settings: HOME_FIXED_10K,
      })
    ).toThrow(HomeServiceOutOfRangeError);
  });

  it('H. client-forged homeServiceFee is irrelevant -- calculator always recomputes from settings', () => {
    // The calculator has no "client homeServiceFee" input at all; this is
    // structural proof a forged value can never reach the result.
    const result = calculatePricing({
      serviceBasePrice: 50000,
      bookingType: 'home',
      tipAmountInput: 0,
      voucher: null,
      distanceKm: 1,
      barberMaxDistanceKm: null,
      settings: HOME_FIXED_10K,
    });
    expect(result.homeServiceFee).toBe(10000);
  });

  it('I. client-forged applicationFee is irrelevant -- calculator always recomputes from settings', () => {
    const result = calculatePricing({
      serviceBasePrice: 50000,
      bookingType: 'onsite',
      tipAmountInput: 0,
      voucher: null,
      distanceKm: null,
      barberMaxDistanceKm: null,
      settings: {
        applicationFee: { enabled: true, mode: 'fixed', fixedAmount: 2500 },
        homeServiceFee: NO_FEES.homeServiceFee,
      },
    });
    expect(result.applicationFee).toBe(2500);
  });

  it('J. client-forged voucherDiscount is irrelevant -- only a server-resolved voucher is honored', () => {
    const result = calculatePricing({
      serviceBasePrice: 50000,
      bookingType: 'onsite',
      tipAmountInput: 0,
      voucher: null, // no voucher resolved server-side, regardless of what client claimed
      distanceKm: null,
      barberMaxDistanceKm: null,
      settings: NO_FEES,
    });
    expect(result.voucherDiscount).toBe(0);
    expect(result.grossAmount).toBe(50000);
  });

  it('K. negative tip is sanitized to 0, never subtracted', () => {
    const result = calculatePricing({
      serviceBasePrice: 50000,
      bookingType: 'onsite',
      tipAmountInput: -5000,
      voucher: null,
      distanceKm: null,
      barberMaxDistanceKm: null,
      settings: NO_FEES,
    });
    expect(result.tipAmount).toBe(0);
    expect(result.grossAmount).toBe(50000);
  });

  it('voucherDiscount never exceeds baseAmount (fixed discount larger than price)', () => {
    const result = calculatePricing({
      serviceBasePrice: 10000,
      bookingType: 'onsite',
      tipAmountInput: 0,
      voucher: { code: 'BIGDISC', discountType: 'fixed', discountValue: 999999 },
      distanceKm: null,
      barberMaxDistanceKm: null,
      settings: NO_FEES,
    });
    expect(result.voucherDiscount).toBe(10000);
    expect(result.discountedBaseAmount).toBe(0);
    expect(result.grossAmount).toBe(0);
  });

  it('percentage voucher respects maxDiscountAmount cap', () => {
    const result = calculatePricing({
      serviceBasePrice: 200000,
      bookingType: 'onsite',
      tipAmountInput: 0,
      voucher: { code: 'CAP', discountType: 'percentage', discountValue: 50, maxDiscountAmount: 30000 },
      distanceKm: null,
      barberMaxDistanceKm: null,
      settings: NO_FEES,
    });
    // 50% of 200000 = 100000, capped to 30000
    expect(result.voucherDiscount).toBe(30000);
  });

  it('home booking without distanceKm throws HomeServiceLocationRequiredError', () => {
    expect(() =>
      calculatePricing({
        serviceBasePrice: 50000,
        bookingType: 'home',
        tipAmountInput: 0,
        voucher: null,
        distanceKm: null,
        barberMaxDistanceKm: null,
        settings: HOME_FIXED_10K,
      })
    ).toThrow(HomeServiceLocationRequiredError);
  });

  it('onsite booking never charges a home service fee even when settings enable one', () => {
    const result = calculatePricing({
      serviceBasePrice: 50000,
      bookingType: 'onsite',
      tipAmountInput: 0,
      voucher: null,
      distanceKm: null,
      barberMaxDistanceKm: null,
      settings: HOME_FIXED_10K,
    });
    expect(result.homeServiceFee).toBe(0);
    expect(result.homeServiceFeeMode).toBeNull();
  });

  it('grossAmount is never negative', () => {
    const result = calculatePricing({
      serviceBasePrice: 100,
      bookingType: 'onsite',
      tipAmountInput: 0,
      voucher: { code: 'HUGE', discountType: 'fixed', discountValue: 100 },
      distanceKm: null,
      barberMaxDistanceKm: null,
      settings: NO_FEES,
    });
    expect(result.grossAmount).toBeGreaterThanOrEqual(0);
  });
});
