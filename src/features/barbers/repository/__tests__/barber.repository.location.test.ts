/**
 * Unit Tests for BarberRepository.updateBarberLocation (Batch 10B-4)
 * `location` and `geohash` must always be derived from the same coordinate pair
 * in a single write -- the UI never supplies a geohash value directly.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const updateDocMock = vi.fn();

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  setDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  collection: vi.fn(),
  Timestamp: { now: () => 'MOCK_TIMESTAMP' },
}));

vi.mock('@/lib/firebase', () => ({ firestore: {} }));
vi.mock('@/lib/promise', () => ({ withTimeout: (p: Promise<unknown>) => p }));

import { barberRepository } from '../barber.repository';

describe('barberRepository.updateBarberLocation', () => {
  beforeEach(() => {
    updateDocMock.mockReset();
    updateDocMock.mockResolvedValue(undefined);
  });

  it('J. writes location and a matching geohash derived from the same coordinates in one call', async () => {
    const res = await barberRepository.updateBarberLocation('barber-1', {
      latitude: -7.2278,
      longitude: 107.9087,
      shopAddress: 'Jl. Test No. 1',
    });

    expect(res.success).toBe(true);
    expect(updateDocMock).toHaveBeenCalledTimes(1);

    const [, payload] = updateDocMock.mock.calls[0];
    expect(payload.location).toEqual({ latitude: -7.2278, longitude: 107.9087 });
    expect(typeof payload.geohash).toBe('string');
    expect(payload.geohash.length).toBeGreaterThan(0);
    expect(payload.shopAddress).toBe('Jl. Test No. 1');
  });

  it('K. rejects an out-of-range coordinate without writing anything', async () => {
    const res = await barberRepository.updateBarberLocation('barber-1', {
      latitude: 999,
      longitude: 999,
      shopAddress: 'Jl. Test No. 1',
    });

    expect(res.success).toBe(false);
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it('K2. rejects a NaN coordinate without writing anything', async () => {
    const res = await barberRepository.updateBarberLocation('barber-1', {
      latitude: NaN,
      longitude: 107.9087,
      shopAddress: 'Jl. Test No. 1',
    });

    expect(res.success).toBe(false);
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it('K3. rejects an Infinity coordinate without writing anything', async () => {
    const res = await barberRepository.updateBarberLocation('barber-1', {
      latitude: Infinity,
      longitude: 107.9087,
      shopAddress: 'Jl. Test No. 1',
    });

    expect(res.success).toBe(false);
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it('K4. rejects exact 0,0 (never a genuine shop location, always a GPS/parsing failure signature)', async () => {
    const res = await barberRepository.updateBarberLocation('barber-1', {
      latitude: 0,
      longitude: 0,
      shopAddress: 'Jl. Test No. 1',
    });

    expect(res.success).toBe(false);
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  /**
   * §15/§17 of the manual-map-picker pass: this repository function has no
   * concept of "GPS-detected" vs "manually chosen on a map" -- both call
   * sites pass a plain {latitude, longitude, shopAddress}, so the same
   * write path (and the same geohash derivation) must work identically for
   * any valid coordinate anywhere, not just the app's disclosed Garut
   * fallback region.
   */
  it.each([
    ['Bandung', -6.9175, 107.6191],
    ['Jakarta', -6.2088, 106.8456],
    ['Medan (outside Java)', 3.5952, 98.6722],
  ])('L. writes a valid, correctly-geohashed location for a %s coordinate (non-Garut)', async (_label, latitude, longitude) => {
    const res = await barberRepository.updateBarberLocation('barber-1', {
      latitude,
      longitude,
      shopAddress: 'Manually selected address',
    });

    expect(res.success).toBe(true);
    const [, payload] = updateDocMock.mock.calls[0];
    expect(payload.location).toEqual({ latitude, longitude });
    expect(typeof payload.geohash).toBe('string');
    expect(payload.geohash.length).toBeGreaterThan(0);
    updateDocMock.mockClear();
  });
});

/**
 * Batch 10B-4C: the Barber's own "Status Toko" (open/closed) UI must write
 * acceptingNewBookings only -- listingStatus is trusted-backend/Admin-authoritative
 * (set by approve/reject/suspend/reactivate in backend/vercel/src/admin/admin.service.ts)
 * and must never be touched by this call.
 */
describe('barberRepository.toggleAcceptingNewBookings', () => {
  beforeEach(() => {
    updateDocMock.mockReset();
    updateDocMock.mockResolvedValue(undefined);
  });

  it('writes only acceptingNewBookings (and updatedAt), never listingStatus', async () => {
    const res = await barberRepository.toggleAcceptingNewBookings('barber-1', false);

    expect(res.success).toBe(true);
    expect(updateDocMock).toHaveBeenCalledTimes(1);

    const [, payload] = updateDocMock.mock.calls[0];
    expect(payload).toHaveProperty('acceptingNewBookings', false);
    expect(payload).not.toHaveProperty('listingStatus');
    expect(Object.keys(payload).sort()).toEqual(['acceptingNewBookings', 'updatedAt']);
  });

  it('supports both toggle directions', async () => {
    await barberRepository.toggleAcceptingNewBookings('barber-1', true);
    expect(updateDocMock.mock.calls[0][1].acceptingNewBookings).toBe(true);

    await barberRepository.toggleAcceptingNewBookings('barber-1', false);
    expect(updateDocMock.mock.calls[1][1].acceptingNewBookings).toBe(false);
  });
});
