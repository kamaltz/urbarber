/**
 * Unit Tests for Geospatial Utilities
 */

import { describe, expect, it } from 'vitest';
import { calculateDistanceKm, getGeohash, getGeohashBounds, validateCoordinates } from '../geo.utils';

describe('Geospatial Utilities', () => {
  it('validateCoordinates should correctly validate latitude and longitude bounds', () => {
    expect(validateCoordinates(-7.2278, 107.9087)).toBe(true);
    expect(validateCoordinates(-91, 107.9087)).toBe(false);
    expect(validateCoordinates(90, 181)).toBe(false);
    expect(validateCoordinates(NaN, 100)).toBe(false);
  });

  it('calculateDistanceKm should return accurate straight-line distance in kilometers', () => {
    // Garut City Center (-7.2278, 107.9087) to Tarogong (-7.1895, 107.8973) ~4.3 km
    const dist = calculateDistanceKm(-7.2278, 107.9087, -7.1895, 107.8973);
    expect(dist).toBeGreaterThan(4);
    expect(dist).toBeLessThan(5);
  });

  it('getGeohash should produce valid geohash string for coordinates', () => {
    const hash = getGeohash(-7.2278, 107.9087);
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(5);
  });

  it('getGeohashBounds should return array of geohash bounds', () => {
    const bounds = getGeohashBounds([-7.2278, 107.9087], 10);
    expect(Array.isArray(bounds)).toBe(true);
    expect(bounds.length).toBeGreaterThan(0);
    expect(bounds[0].length).toBe(2);
  });
});
