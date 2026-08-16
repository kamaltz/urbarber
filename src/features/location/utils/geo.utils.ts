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
