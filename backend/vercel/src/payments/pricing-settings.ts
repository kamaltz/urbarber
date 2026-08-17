/**
 * Reads/writes the single canonical pricing settings document,
 * platformSettings/bookingPricing. See pricing-calculator.ts for how these
 * values are applied.
 */
import { db } from '../lib/firebase-admin.js';
import type { ApplicationFeeMode, BookingPricingSettings, HomeServiceFeeMode } from './pricing-calculator.js';

const SETTINGS_DOC_PATH = ['platformSettings', 'bookingPricing'] as const;

// Reproduces today's pre-existing hardcoded behavior exactly (application fee
// off, home service fee a flat Rp10.000) -- so wiring this module in is a
// zero-behavior-change deploy until an admin actually edits the settings.
export const DEFAULT_PRICING_SETTINGS: BookingPricingSettings = {
  applicationFee: {
    enabled: false,
    mode: 'fixed',
    fixedAmount: 0,
  },
  homeServiceFee: {
    enabled: true,
    mode: 'fixed',
    fixedAmount: 10000,
  },
};

function normalizeApplicationFeeMode(value: unknown): ApplicationFeeMode {
  return value === 'percentage' ? 'percentage' : 'fixed';
}

function normalizeHomeServiceFeeMode(value: unknown): HomeServiceFeeMode {
  return value === 'distance' ? 'distance' : 'fixed';
}

function toFiniteNumber(value: unknown): number | undefined {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

export interface PricingSettingsSnapshot {
  settings: BookingPricingSettings;
  /** The settings doc's updatedAt at read time, or 'default' if no doc exists yet. */
  version: string;
}

export function normalizeSettings(raw: FirebaseFirestore.DocumentData | undefined): BookingPricingSettings {
  if (!raw) return DEFAULT_PRICING_SETTINGS;

  const appFeeRaw = raw.applicationFee || {};
  const homeFeeRaw = raw.homeServiceFee || {};

  return {
    applicationFee: {
      enabled: appFeeRaw.enabled === true,
      mode: normalizeApplicationFeeMode(appFeeRaw.mode),
      fixedAmount: toFiniteNumber(appFeeRaw.fixedAmount),
      percentage: toFiniteNumber(appFeeRaw.percentage),
      minimumAmount: toFiniteNumber(appFeeRaw.minimumAmount),
      maximumAmount: toFiniteNumber(appFeeRaw.maximumAmount),
    },
    homeServiceFee: {
      enabled: homeFeeRaw.enabled !== false,
      mode: normalizeHomeServiceFeeMode(homeFeeRaw.mode),
      fixedAmount: toFiniteNumber(homeFeeRaw.fixedAmount) ?? DEFAULT_PRICING_SETTINGS.homeServiceFee.fixedAmount,
      baseAmount: toFiniteNumber(homeFeeRaw.baseAmount),
      includedDistanceKm: toFiniteNumber(homeFeeRaw.includedDistanceKm),
      perKmAmount: toFiniteNumber(homeFeeRaw.perKmAmount),
      maxServiceDistanceKm: toFiniteNumber(homeFeeRaw.maxServiceDistanceKm),
    },
  };
}

let cached: { data: PricingSettingsSnapshot; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Cached read for the hot payment-creation path (bounded 5-minute staleness --
 * acceptable for a fee setting, avoids a Firestore read on every single
 * payment creation). Admin read/write endpoints must call
 * getPricingSettingsFresh() instead so the settings UI never shows stale state.
 */
export async function getBookingPricingSettings(): Promise<PricingSettingsSnapshot> {
  const now = Date.now();
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const data = await getPricingSettingsFresh();
  cached = { data, fetchedAt: now };
  return data;
}

export async function getPricingSettingsFresh(): Promise<PricingSettingsSnapshot> {
  const snap = await db.collection(SETTINGS_DOC_PATH[0]).doc(SETTINGS_DOC_PATH[1]).get();
  const raw = snap.exists ? snap.data() : undefined;
  return {
    settings: normalizeSettings(raw),
    version: raw?.updatedAt ? String(raw.updatedAt) : 'default',
  };
}

export async function savePricingSettings(
  settings: BookingPricingSettings,
  updatedBy: string
): Promise<void> {
  await db
    .collection(SETTINGS_DOC_PATH[0])
    .doc(SETTINGS_DOC_PATH[1])
    .set(
      {
        ...settings,
        updatedAt: new Date().toISOString(),
        updatedBy,
      },
      { merge: false }
    );
  cached = null;
}
