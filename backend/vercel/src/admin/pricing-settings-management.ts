/**
 * Admin-facing pricing settings read/write.
 * Backend-authoritative: this is the ONLY write path for
 * platformSettings/bookingPricing. Client/customer read access, if ever
 * needed, must go through a separate sanitized-read endpoint -- never this one.
 */
import type { AdminPricingSettings, PricingSettingsUpdateResult } from './admin.types.js';
import { logAdminEvent } from './audit-log.js';
import { getPricingSettingsFresh, savePricingSettings } from '../payments/pricing-settings.js';

export async function getPricingSettingsForAdmin(): Promise<AdminPricingSettings> {
  const snapshot = await getPricingSettingsFresh();
  return snapshot.settings;
}

export async function updatePricingSettingsForAdmin(
  settings: AdminPricingSettings,
  adminUid: string
): Promise<PricingSettingsUpdateResult> {
  await savePricingSettings(settings, adminUid);
  const updatedAt = new Date().toISOString();

  await logAdminEvent(adminUid, 'PRICING_SETTINGS_UPDATED', 'platformSettings/bookingPricing', {
    applicationFeeEnabled: settings.applicationFee.enabled,
    applicationFeeMode: settings.applicationFee.mode,
    homeServiceFeeEnabled: settings.homeServiceFee.enabled,
    homeServiceFeeMode: settings.homeServiceFee.mode,
  });

  return { settings, updatedAt, updatedBy: adminUid };
}
