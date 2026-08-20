/**
 * Reverse geocoding for the Barber manual map location picker. No app-wide
 * reverse-geocoding utility existed before this (audited: no other
 * "reverseGeocode" call site in the codebase), so this is the one canonical
 * place for it -- reused wherever a coordinate needs to become a readable
 * address, rather than duplicated per screen.
 *
 * Uses expo-location's on-device reverseGeocodeAsync (Apple/Google Play
 * Services geocoding under the hood) -- free, no separate paid API key,
 * consistent with the rest of this app's location stack (expo-location is
 * already a dependency for GPS).
 */
import * as Location from 'expo-location';

/**
 * Composes a short, human-readable address from whichever fields the
 * platform's geocoder actually returned -- coverage varies by platform/
 * locale, so every field is optional. Returns null (never throws) when
 * geocoding fails or returns no usable text, so callers can fall back to a
 * safe placeholder without special-casing errors.
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    const first = results?.[0];
    if (!first) return null;

    // formattedAddress is Android-only but already composed; prefer it when present.
    if (first.formattedAddress) return first.formattedAddress;

    const parts = [first.street, first.district, first.city, first.region].filter(
      (part): part is string => Boolean(part && part.trim())
    );

    return parts.length > 0 ? parts.join(', ') : first.name || null;
  } catch {
    return null;
  }
}
