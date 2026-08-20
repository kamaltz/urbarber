/**
 * Unit tests for reverseGeocode (§8 of the manual-map-picker pass).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reverseGeocodeAsyncMock = vi.fn();

vi.mock('expo-location', () => ({
  reverseGeocodeAsync: (...args: unknown[]) => reverseGeocodeAsyncMock(...args),
}));

import { reverseGeocode } from '../reverse-geocode.service';

describe('reverseGeocode', () => {
  beforeEach(() => {
    reverseGeocodeAsyncMock.mockReset();
  });

  it('prefers formattedAddress when the platform geocoder provides one (Android)', async () => {
    reverseGeocodeAsyncMock.mockResolvedValue([
      { formattedAddress: '111 8th Avenue, New York, NY', street: '8th Avenue', city: 'New York' },
    ]);

    const result = await reverseGeocode(40.7484, -73.9857);
    expect(result).toBe('111 8th Avenue, New York, NY');
  });

  it('composes from street/district/city/region when formattedAddress is absent (iOS)', async () => {
    reverseGeocodeAsyncMock.mockResolvedValue([
      { formattedAddress: null, street: 'Jl. Ahmad Yani', district: null, city: 'Bandung', region: 'Jawa Barat' },
    ]);

    const result = await reverseGeocode(-6.9175, 107.6191);
    expect(result).toBe('Jl. Ahmad Yani, Bandung, Jawa Barat');
  });

  it('falls back to name when no address parts are available', async () => {
    reverseGeocodeAsyncMock.mockResolvedValue([
      { formattedAddress: null, street: null, district: null, city: null, region: null, name: 'Tower Bridge' },
    ]);

    const result = await reverseGeocode(51.5055, -0.0754);
    expect(result).toBe('Tower Bridge');
  });

  it('returns null when the geocoder returns an empty array', async () => {
    reverseGeocodeAsyncMock.mockResolvedValue([]);
    const result = await reverseGeocode(0.1, 0.1);
    expect(result).toBeNull();
  });

  it('returns null (never throws) when the geocoder call itself fails', async () => {
    reverseGeocodeAsyncMock.mockRejectedValue(new Error('network error'));
    await expect(reverseGeocode(-6.9175, 107.6191)).resolves.toBeNull();
  });

  it('returns null when every address field and name are empty/null', async () => {
    reverseGeocodeAsyncMock.mockResolvedValue([
      { formattedAddress: null, street: null, district: null, city: null, region: null, name: null },
    ]);
    const result = await reverseGeocode(-6.9175, 107.6191);
    expect(result).toBeNull();
  });
});
