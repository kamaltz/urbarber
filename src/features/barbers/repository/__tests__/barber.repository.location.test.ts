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
