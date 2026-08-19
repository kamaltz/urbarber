/**
 * Cross-platform "open in maps app" deep link. No routing/directions API and
 * no API key involved -- this only hands off to whatever maps app is already
 * installed (or a browser fallback), the same key-free mechanism any app can
 * use via Linking.openURL. If a platform-specific scheme isn't available,
 * this still returns the universal Google Maps web URL, which every
 * platform can open in a browser.
 */
import { Platform } from 'react-native';

/**
 * `platform` defaults to the real Platform.OS -- exposed as a parameter
 * purely so this stays a pure, directly unit-testable function (no
 * react-native module mocking required to exercise every branch).
 */
export function buildNavigationUrl(
  latitude: number,
  longitude: number,
  label?: string,
  platform: string = Platform.OS
): string | null {
  if (typeof latitude !== 'number' || typeof longitude !== 'number' || !isFinite(latitude) || !isFinite(longitude)) {
    return null;
  }

  const encodedLabel = label ? encodeURIComponent(label) : undefined;

  if (platform === 'ios') {
    return `https://maps.apple.com/?daddr=${latitude},${longitude}${encodedLabel ? `&q=${encodedLabel}` : ''}`;
  }

  if (platform === 'android') {
    return `geo:${latitude},${longitude}?q=${latitude},${longitude}${encodedLabel ? `(${encodedLabel})` : ''}`;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}
