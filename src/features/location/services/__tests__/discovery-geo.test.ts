import { describe, expect, it } from 'vitest';
import { calculateDistanceKm, getGeohash, validateCoordinates } from '../../utils/geo.utils';

describe('Discovery & Geolocation Utilities', () => {
  it('1. validateCoordinates rejects invalid coordinates, NaN, out-of-bounds, and 0,0', () => {
    expect(validateCoordinates(-7.2278, 107.9087)).toBe(true); // Garut, valid
    expect(validateCoordinates(0, 0)).toBe(false); // 0,0 rejected
    expect(validateCoordinates(91, 100)).toBe(false); // Lat > 90
    expect(validateCoordinates(-91, 100)).toBe(false); // Lat < -90
    expect(validateCoordinates(10, 181)).toBe(false); // Lng > 180
    expect(validateCoordinates(NaN, 107.9)).toBe(false);
  });

  it('2. getGeohash returns non-empty geohash for valid coordinates and empty for invalid', () => {
    const hash = getGeohash(-7.2278, 107.9087);
    expect(hash).toBeTruthy();
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(3);

    expect(getGeohash(0, 0)).toBe('');
    expect(getGeohash(100, 200)).toBe('');
  });

  it('3. calculateDistanceKm computes accurate Haversine distance in km', () => {
    // Garut center to ~2km away
    const distNear = calculateDistanceKm(-7.2278, 107.9087, -7.2295, 107.9073);
    expect(distNear).toBeGreaterThan(0);
    expect(distNear).toBeLessThan(5);

    // Garut to Bandung (~50km)
    const distFar = calculateDistanceKm(-7.2278, 107.9087, -6.9175, 107.6191);
    expect(distFar).toBeGreaterThan(40);
    expect(distFar).toBeLessThan(70);

    // Invalid coordinates return 0 distance
    expect(calculateDistanceKm(0, 0, -7.2, 107.9)).toBe(0);
  });
});
