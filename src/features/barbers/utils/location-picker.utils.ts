/**
 * Pure helpers for the Barber manual map location picker. Kept dependency
 * -free (no react-native/expo-location/maplibre imports) so they're unit
 * -testable directly -- importing location-picker.tsx itself would pull in
 * react-native's and @maplibre/maplibre-react-native's untranspiled native
 * module code, which the test bundler can't parse (same lesson as
 * DatePicker.tsx/calendar-grid.ts).
 */
import { validateCoordinates } from '@/features/location/utils/geo.utils';
import { MAP_CONFIG } from '@/config/map.config';

export interface LocationCandidate {
  latitude: number;
  longitude: number;
}

/**
 * Initial candidate priority: existing saved Barber location (passed in as
 * route params, parsed here) -> regional fallback. Live device GPS is
 * layered on top separately by the screen itself (an async effect, since it
 * needs a permission check) -- this function only decides the synchronous
 * starting point before that effect can run, so the map never renders with
 * no camera position at all.
 */
export function resolveInitialCandidate(params: { lat?: string; lng?: string }): LocationCandidate {
  const lat = params.lat !== undefined ? Number(params.lat) : NaN;
  const lng = params.lng !== undefined ? Number(params.lng) : NaN;
  if (validateCoordinates(lat, lng)) {
    return { latitude: lat, longitude: lng };
  }
  return { latitude: MAP_CONFIG.defaultViewport.latitude, longitude: MAP_CONFIG.defaultViewport.longitude };
}

/** True when the route params carried a valid pre-existing saved location. */
export function hasSavedLocation(params: { lat?: string; lng?: string }): boolean {
  const lat = params.lat !== undefined ? Number(params.lat) : NaN;
  const lng = params.lng !== undefined ? Number(params.lng) : NaN;
  return validateCoordinates(lat, lng);
}

/**
 * Parses a MapLibre press/drag event's nativeEvent.lngLat tuple into a
 * candidate, or null if the event doesn't carry a usable coordinate.
 */
export function parseLngLatEvent(event: unknown): LocationCandidate | null {
  const lngLat = (event as { nativeEvent?: { lngLat?: unknown } } | null | undefined)?.nativeEvent?.lngLat;
  if (!Array.isArray(lngLat) || lngLat.length !== 2) return null;
  const [longitude, latitude] = lngLat;
  if (typeof longitude !== 'number' || typeof latitude !== 'number') return null;
  return { latitude, longitude };
}
