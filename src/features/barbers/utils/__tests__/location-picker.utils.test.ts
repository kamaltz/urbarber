/**
 * Unit tests for the Barber manual map location picker's pure helpers
 * (§17 of the manual-map-picker pass).
 */
import { describe, expect, it } from 'vitest';
import { hasSavedLocation, parseLngLatEvent, resolveInitialCandidate } from '../location-picker.utils';
import { MAP_CONFIG } from '@/config/map.config';

describe('resolveInitialCandidate', () => {
  it('uses the existing saved Barber location when valid params are supplied', () => {
    const candidate = resolveInitialCandidate({ lat: '-6.9175', lng: '107.6191' });
    expect(candidate).toEqual({ latitude: -6.9175, longitude: 107.6191 });
  });

  it('falls back to the regional default when no params are supplied at all', () => {
    const candidate = resolveInitialCandidate({});
    expect(candidate).toEqual({
      latitude: MAP_CONFIG.defaultViewport.latitude,
      longitude: MAP_CONFIG.defaultViewport.longitude,
    });
  });

  it('falls back to the regional default when params are present but invalid (out of range)', () => {
    const candidate = resolveInitialCandidate({ lat: '999', lng: '999' });
    expect(candidate).toEqual({
      latitude: MAP_CONFIG.defaultViewport.latitude,
      longitude: MAP_CONFIG.defaultViewport.longitude,
    });
  });

  it('falls back to the regional default when params are non-numeric strings', () => {
    const candidate = resolveInitialCandidate({ lat: 'not-a-number', lng: 'also-not' });
    expect(candidate).toEqual({
      latitude: MAP_CONFIG.defaultViewport.latitude,
      longitude: MAP_CONFIG.defaultViewport.longitude,
    });
  });

  it('accepts a valid coordinate far from Garut (Jakarta) unchanged -- no regional restriction', () => {
    const candidate = resolveInitialCandidate({ lat: '-6.2088', lng: '106.8456' });
    expect(candidate).toEqual({ latitude: -6.2088, longitude: 106.8456 });
  });
});

describe('hasSavedLocation', () => {
  it('true for a valid saved coordinate', () => {
    expect(hasSavedLocation({ lat: '-6.9175', lng: '107.6191' })).toBe(true);
  });

  it('false when params are missing', () => {
    expect(hasSavedLocation({})).toBe(false);
  });

  it('false for an out-of-range coordinate', () => {
    expect(hasSavedLocation({ lat: '999', lng: '999' })).toBe(false);
  });

  it('false for exact 0,0 (never a genuine saved location)', () => {
    expect(hasSavedLocation({ lat: '0', lng: '0' })).toBe(false);
  });
});

describe('parseLngLatEvent', () => {
  it('parses a well-formed MapLibre press/drag event into a candidate', () => {
    const event = { nativeEvent: { lngLat: [107.6191, -6.9175] } };
    expect(parseLngLatEvent(event)).toEqual({ latitude: -6.9175, longitude: 107.6191 });
  });

  it('returns null when nativeEvent is missing', () => {
    expect(parseLngLatEvent({})).toBeNull();
  });

  it('returns null when lngLat is not a 2-tuple', () => {
    expect(parseLngLatEvent({ nativeEvent: { lngLat: [1] } })).toBeNull();
    expect(parseLngLatEvent({ nativeEvent: { lngLat: [1, 2, 3] } })).toBeNull();
  });

  it('returns null when lngLat entries are not numbers', () => {
    expect(parseLngLatEvent({ nativeEvent: { lngLat: ['a', 'b'] } })).toBeNull();
  });

  it('returns null for a completely malformed event (never throws)', () => {
    expect(() => parseLngLatEvent(null)).not.toThrow();
    expect(parseLngLatEvent(null)).toBeNull();
    expect(parseLngLatEvent(undefined)).toBeNull();
  });
});
