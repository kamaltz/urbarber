/**
 * Server-side port of src/features/location/utils/geo.utils.ts (Haversine
 * distance + coordinate validation). backend/vercel is a standalone deployable
 * with no shared package boundary to the mobile app, so this mirrors that
 * module's logic rather than importing across the app/backend split --
 * consistent with this backend's existing self-contained domain-logic modules
 * (e.g. service-booking-guard.ts, slot-datetime.ts).
 */

export function validateCoordinates(latitude: number, longitude: number): boolean {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return false;
  if (latitude === 0 && longitude === 0) return false;
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

/** Straight-line Haversine distance in kilometers. Returns null for invalid input. */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number | null {
  if (!validateCoordinates(lat1, lon1) || !validateCoordinates(lat2, lon2)) {
    return null;
  }

  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}
