/**
 * Geospatial Utilities
 * Pure functions for Haversine distance, geohashing, bounds generation, and coordinate validation.
 */

import { geohashForLocation, geohashQueryBounds } from 'geofire-common';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Validate latitude and longitude bounds
 */
export function validateCoordinates(latitude: number, longitude: number): boolean {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
  if (isNaN(latitude) || isNaN(longitude)) return false;
  if (latitude === 0 && longitude === 0) return false;
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

/**
 * Calculate straight-line Haversine distance in kilometers between two coordinates
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (!validateCoordinates(lat1, lon1) || !validateCoordinates(lat2, lon2)) {
    return 0;
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
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

export interface EtaEstimate {
  minMinutes: number;
  maxMinutes: number;
  /** 'observed' when a real GPS speed sample from the Barber's device drove
   * the estimate, 'default' when it fell back to the conservative urban-speed
   * constant (no routing service exists in this app -- see MAP_CONFIG). */
  basis: 'observed' | 'default';
}

const DEFAULT_URBAN_SPEED_KMH = 25;
const MIN_URBAN_SPEED_KMH = 10;
const MAX_URBAN_SPEED_KMH = 60;
// Below this, a GPS speed reading is indistinguishable from "stopped at a
// light" noise -- not a usable "the Barber is moving at X" sample.
const MIN_OBSERVED_SPEED_MPS = 1;
const ETA_BAND_RATIO = 0.25;
const MIN_ETA_MINUTES = 1;

/**
 * Straight-line-distance ETA range in minutes. No routing/directions API is
 * integrated anywhere in this app (tracking only ever had Haversine
 * distance), so this is deliberately presented as a range, never a single
 * precise number, and callers must label it "Perkiraan".
 *
 * Prefers the Barber's most recent GPS-reported speed (bookingTracking.speed,
 * written by tracking.service.ts from Location.watchPositionAsync) when it's
 * a real, currently-moving sample; otherwise falls back to a bounded
 * conservative urban riding speed. Either way the effective speed is clamped
 * to [MIN_URBAN_SPEED_KMH, MAX_URBAN_SPEED_KMH] so a GPS noise spike or a
 * near-zero speed can never produce 0/negative/NaN/Infinity minutes.
 */
export function estimateEtaMinutes(distanceKm: number, observedSpeedMps?: number | null): EtaEstimate | null {
  if (typeof distanceKm !== 'number' || !isFinite(distanceKm) || distanceKm < 0) return null;

  let speedKmh = DEFAULT_URBAN_SPEED_KMH;
  let basis: EtaEstimate['basis'] = 'default';
  if (typeof observedSpeedMps === 'number' && isFinite(observedSpeedMps) && observedSpeedMps > MIN_OBSERVED_SPEED_MPS) {
    speedKmh = observedSpeedMps * 3.6;
    basis = 'observed';
  }
  speedKmh = Math.min(Math.max(speedKmh, MIN_URBAN_SPEED_KMH), MAX_URBAN_SPEED_KMH);

  const pointMinutes = (distanceKm / speedKmh) * 60;
  const minMinutes = Math.max(MIN_ETA_MINUTES, Math.floor(pointMinutes * (1 - ETA_BAND_RATIO)));
  const maxMinutes = Math.max(minMinutes, Math.ceil(pointMinutes * (1 + ETA_BAND_RATIO)));

  return { minMinutes, maxMinutes, basis };
}

/**
 * Compute Geohash string for a given coordinate pair
 */
export function getGeohash(latitude: number, longitude: number): string {
  if (!validateCoordinates(latitude, longitude)) {
    return '';
  }
  return geohashForLocation([latitude, longitude]);
}

/**
 * Compute geohash query bounds for a center point and radius in kilometers
 */
export function getGeohashBounds(center: [number, number], radiusKm: number) {
  const radiusInM = radiusKm * 1000;
  return geohashQueryBounds(center, radiusInM);
}
