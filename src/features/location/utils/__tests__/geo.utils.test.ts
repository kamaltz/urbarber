/**
 * Unit Tests for Geospatial Utilities
 */

import { describe, expect, it } from 'vitest';
import { calculateDistanceKm, estimateEtaMinutes, getGeohash, getGeohashBounds, validateCoordinates } from '../geo.utils';

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

describe('estimateEtaMinutes', () => {
  it('falls back to the default urban speed when no observed speed is given', () => {
    const eta = estimateEtaMinutes(5, undefined);
    expect(eta).not.toBeNull();
    expect(eta!.basis).toBe('default');
    // 5km at 25km/h default = 12 minutes point estimate, banded +/-25%
    expect(eta!.minMinutes).toBeGreaterThanOrEqual(1);
    expect(eta!.maxMinutes).toBeGreaterThan(eta!.minMinutes);
  });

  it('prefers a real, currently-moving observed GPS speed over the default', () => {
    // 10 m/s = 36 km/h
    const eta = estimateEtaMinutes(6, 10);
    expect(eta!.basis).toBe('observed');
  });

  it('treats a near-stationary GPS speed (<=1 m/s, e.g. stopped at a light) as not usable -- falls back to default', () => {
    const eta = estimateEtaMinutes(3, 0.4);
    expect(eta!.basis).toBe('default');
  });

  it('clamps an unrealistic/noisy observed speed spike to the max bound rather than producing a tiny ETA', () => {
    // 100 m/s = 360 km/h -- clearly GPS noise, must be clamped
    const etaNoisy = estimateEtaMinutes(10, 100);
    const etaAtMaxBound = estimateEtaMinutes(10, 60 / 3.6); // exactly at the 60km/h ceiling
    expect(etaNoisy!.minMinutes).toBe(etaAtMaxBound!.minMinutes);
    expect(etaNoisy!.maxMinutes).toBe(etaAtMaxBound!.maxMinutes);
  });

  it('never returns 0, negative, NaN, or Infinity minutes even for a ~0 distance', () => {
    const eta = estimateEtaMinutes(0, 15);
    expect(eta!.minMinutes).toBeGreaterThanOrEqual(1);
    expect(Number.isFinite(eta!.minMinutes)).toBe(true);
    expect(Number.isFinite(eta!.maxMinutes)).toBe(true);
  });

  it('returns null for invalid distance input rather than a fabricated ETA', () => {
    expect(estimateEtaMinutes(NaN)).toBeNull();
    expect(estimateEtaMinutes(-2)).toBeNull();
  });

  it('maxMinutes is never less than minMinutes', () => {
    for (const distanceKm of [0, 0.05, 1, 5, 20, 100]) {
      const eta = estimateEtaMinutes(distanceKm, 8);
      expect(eta!.maxMinutes).toBeGreaterThanOrEqual(eta!.minMinutes);
    }
  });
});
