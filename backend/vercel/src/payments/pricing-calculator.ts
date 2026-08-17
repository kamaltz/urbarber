/**
 * Canonical, authoritative pricing calculator for bookings/payments.
 *
 * Single source of truth for the money formula. Previously this arithmetic was
 * duplicated (and already drifting) across api/payments.ts, a hand-mirrored test
 * file, and two separate mobile-side constants -- see
 * FINAL_THESIS_READINESS_AUDIT.md P0-4. Every amount is an integer Rupiah;
 * floating-point currency math is never used.
 *
 * Formula (fixed order):
 *   baseAmount -> voucherDiscount -> discountedBaseAmount
 *   homeServiceFee (0 for onsite; distance-radius cap enforced for ALL home
 *     bookings regardless of fee mode)
 *   applicationFee (percentage mode is computed on discountedBaseAmount, i.e.
 *     AFTER the voucher discount)
 *   grossAmount = discountedBaseAmount + homeServiceFee + applicationFee + tipAmount
 *
 * Voucher discounts ONLY the base service amount -- never homeServiceFee,
 * applicationFee, or tipAmount.
 */

export type ApplicationFeeMode = 'fixed' | 'percentage';
export type HomeServiceFeeMode = 'fixed' | 'distance';

export interface ApplicationFeeSettings {
  enabled: boolean;
  mode: ApplicationFeeMode;
  fixedAmount?: number;
  percentage?: number;
  minimumAmount?: number;
  maximumAmount?: number;
}

export interface HomeServiceFeeSettings {
  enabled: boolean;
  mode: HomeServiceFeeMode;
  fixedAmount?: number;
  baseAmount?: number;
  includedDistanceKm?: number;
  perKmAmount?: number;
  maxServiceDistanceKm?: number;
}

export interface BookingPricingSettings {
  applicationFee: ApplicationFeeSettings;
  homeServiceFee: HomeServiceFeeSettings;
}

export interface ResolvedVoucherForPricing {
  code: string;
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  maxDiscountAmount?: number;
}

export interface PricingInput {
  /** Canonical service price, read fresh from barberServices/{id} -- never client-supplied. */
  serviceBasePrice: number;
  bookingType: 'home' | 'onsite';
  /** Raw client tip selection; sanitized here (integer, >= 0). */
  tipAmountInput: number;
  /** Pre-validated by voucher-service.ts; null when no voucher is applied. */
  voucher: ResolvedVoucherForPricing | null;
  /**
   * Haversine distance (km) between the barber's permanent shop location and the
   * customer's booking location. Required (non-null) whenever bookingType is
   * 'home' -- the radius cap applies to every home booking regardless of fee mode.
   */
  distanceKm: number | null;
  /** Barber's own configured travel radius (barbers/{id}.serviceRadiusKm), if any. */
  barberMaxDistanceKm: number | null;
  settings: BookingPricingSettings;
}

export interface PricingBreakdown {
  baseAmount: number;
  voucherDiscount: number;
  discountedBaseAmount: number;
  homeServiceFee: number;
  applicationFee: number;
  tipAmount: number;
  grossAmount: number;

  // Frozen snapshot fields -- persisted verbatim on bookings/payments so later
  // admin edits to settings never retroactively change a historical transaction.
  voucherCode: string | null;
  applicationFeeMode: ApplicationFeeMode | null;
  applicationFeeRate: number | null;
  applicationFeeFixedAmount: number | null;
  homeServiceFeeMode: HomeServiceFeeMode | null;
  homeServiceFeeDistanceKm: number | null;
}

export class HomeServiceLocationRequiredError extends Error {
  constructor() {
    super('Lokasi pelanggan wajib diisi untuk booking layanan ke rumah.');
    this.name = 'HomeServiceLocationRequiredError';
  }
}

export class HomeServiceOutOfRangeError extends Error {
  constructor(public readonly distanceKm: number, public readonly maxDistanceKm: number) {
    super(
      `Lokasi Anda (${distanceKm.toFixed(1)} km) berada di luar radius layanan barber ini (maksimum ${maxDistanceKm.toFixed(1)} km).`
    );
    this.name = 'HomeServiceOutOfRangeError';
  }
}

/** Single canonical rounding rule: round-half-away-from-zero, applied once per computed sub-amount. */
export function roundIDR(value: number): number {
  return Math.round(value);
}

function calculateVoucherDiscount(baseAmount: number, voucher: ResolvedVoucherForPricing | null): number {
  if (!voucher || baseAmount <= 0) return 0;

  let discount: number;
  if (voucher.discountType === 'fixed') {
    discount = voucher.discountValue;
  } else {
    discount = roundIDR((baseAmount * voucher.discountValue) / 100);
    if (voucher.maxDiscountAmount !== undefined) {
      discount = Math.min(discount, voucher.maxDiscountAmount);
    }
  }

  return Math.max(0, Math.min(discount, baseAmount));
}

function calculateHomeServiceFee(
  bookingType: 'home' | 'onsite',
  distanceKm: number | null,
  barberMaxDistanceKm: number | null,
  settings: HomeServiceFeeSettings
): { fee: number; mode: HomeServiceFeeMode | null; distanceKmUsed: number | null } {
  if (bookingType === 'onsite') {
    return { fee: 0, mode: null, distanceKmUsed: null };
  }

  if (distanceKm === null) {
    throw new HomeServiceLocationRequiredError();
  }

  // The radius cap applies to every home booking regardless of fee mode --
  // it bounds how far a barber will actually travel, independent of whether
  // the platform charges a distance-based fee for that travel.
  const candidateCaps = [barberMaxDistanceKm, settings.maxServiceDistanceKm].filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v)
  );
  if (candidateCaps.length > 0) {
    const effectiveMaxDistanceKm = Math.min(...candidateCaps);
    if (distanceKm > effectiveMaxDistanceKm) {
      throw new HomeServiceOutOfRangeError(distanceKm, effectiveMaxDistanceKm);
    }
  }

  if (!settings.enabled) {
    return { fee: 0, mode: settings.mode, distanceKmUsed: distanceKm };
  }

  if (settings.mode === 'fixed') {
    return { fee: Math.max(0, roundIDR(settings.fixedAmount ?? 0)), mode: 'fixed', distanceKmUsed: distanceKm };
  }

  // Distance mode: chargeableKm rounds UP (protects against undercharging for
  // partial-km travel); the result is already an integer once multiplied by an
  // integer perKmAmount, so no further rounding step applies.
  const includedKm = settings.includedDistanceKm ?? 0;
  const chargeableKm = Math.max(0, distanceKm - includedKm);
  const perKm = settings.perKmAmount ?? 0;
  const homeFeeBaseAmount = settings.baseAmount ?? 0;
  const fee = Math.max(0, homeFeeBaseAmount + Math.ceil(chargeableKm) * perKm);
  return { fee, mode: 'distance', distanceKmUsed: distanceKm };
}

function calculateApplicationFee(
  discountedBaseAmount: number,
  settings: ApplicationFeeSettings
): { fee: number; mode: ApplicationFeeMode | null; rate: number | null; fixedAmount: number | null } {
  if (!settings.enabled) {
    return { fee: 0, mode: null, rate: null, fixedAmount: null };
  }

  if (settings.mode === 'fixed') {
    const amount = Math.max(0, roundIDR(settings.fixedAmount ?? 0));
    return { fee: amount, mode: 'fixed', rate: null, fixedAmount: amount };
  }

  // Percentage mode is computed on the POST-VOUCHER base amount -- the fee
  // shrinks proportionally when a customer uses a voucher.
  const rate = settings.percentage ?? 0;
  let amount = roundIDR((discountedBaseAmount * rate) / 100);
  if (settings.minimumAmount !== undefined) amount = Math.max(amount, settings.minimumAmount);
  if (settings.maximumAmount !== undefined) amount = Math.min(amount, settings.maximumAmount);
  amount = Math.max(0, amount);

  return { fee: amount, mode: 'percentage', rate, fixedAmount: null };
}

export interface MidtransItemDetail {
  id: string;
  price: number;
  quantity: 1;
  name: string;
}

/**
 * Builds the Midtrans Snap item_details array from a resolved PricingBreakdown.
 * The voucher discount is folded directly into the base-service line price
 * (discountedBaseAmount) rather than emitted as a separate negative-price row --
 * Midtrans channels don't uniformly support negative item_details prices, and
 * this achieves sum(item_details) === grossAmount deterministically, by
 * construction (not by coincidence -- see the sum test in
 * tests/payment-calculation.test.ts).
 */
export function buildMidtransItemDetails(
  breakdown: PricingBreakdown,
  serviceId: string,
  serviceName: string
): MidtransItemDetail[] {
  const items: MidtransItemDetail[] = [
    {
      id: serviceId,
      price: breakdown.discountedBaseAmount,
      quantity: 1,
      name: serviceName.substring(0, 50),
    },
  ];

  if (breakdown.homeServiceFee > 0) {
    items.push({ id: 'HOME_FEE', price: breakdown.homeServiceFee, quantity: 1, name: 'Biaya Layanan ke Rumah' });
  }
  if (breakdown.applicationFee > 0) {
    items.push({ id: 'APP_FEE', price: breakdown.applicationFee, quantity: 1, name: 'Biaya Layanan Aplikasi' });
  }
  if (breakdown.tipAmount > 0) {
    items.push({ id: 'TIP_BARBER', price: breakdown.tipAmount, quantity: 1, name: 'Tip Barber' });
  }

  return items;
}

export function calculatePricing(input: PricingInput): PricingBreakdown {
  const baseAmount = Math.max(0, roundIDR(input.serviceBasePrice || 0));
  const voucherDiscount = calculateVoucherDiscount(baseAmount, input.voucher);
  const discountedBaseAmount = baseAmount - voucherDiscount;

  const homeService = calculateHomeServiceFee(
    input.bookingType,
    input.distanceKm,
    input.barberMaxDistanceKm,
    input.settings.homeServiceFee
  );

  const applicationFeeResult = calculateApplicationFee(discountedBaseAmount, input.settings.applicationFee);

  const tipAmount = Math.max(0, Math.floor(input.tipAmountInput || 0));

  const grossAmount = Math.max(
    0,
    discountedBaseAmount + homeService.fee + applicationFeeResult.fee + tipAmount
  );

  return {
    baseAmount,
    voucherDiscount,
    discountedBaseAmount,
    homeServiceFee: homeService.fee,
    applicationFee: applicationFeeResult.fee,
    tipAmount,
    grossAmount,
    voucherCode: input.voucher?.code ?? null,
    applicationFeeMode: applicationFeeResult.mode,
    applicationFeeRate: applicationFeeResult.rate,
    applicationFeeFixedAmount: applicationFeeResult.fixedAmount,
    homeServiceFeeMode: homeService.mode,
    homeServiceFeeDistanceKm: homeService.distanceKmUsed,
  };
}
