/**
 * Unit Tests for CustomerRepository.searchBarbers location handling (Batch 10B-4)
 * Ensures the hardcoded default-area fallback is never presented as the
 * Customer's real GPS position -- `locationMode` must reflect which one was used.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const searchNearbyBarbersMock = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
}));

vi.mock('@/lib/firebase', () => ({
  firestore: {},
  firebaseAuth: { currentUser: null },
}));

vi.mock('@/lib/promise', () => ({
  withTimeout: (p: Promise<unknown>) => p,
}));

vi.mock('@/features/location/services/discovery.service', () => ({
  discoveryService: { searchNearbyBarbers: (...args: unknown[]) => searchNearbyBarbersMock(...args) },
}));

import { customerRepository } from '../customer.repository';

describe('customerRepository.searchBarbers location handling', () => {
  beforeEach(() => {
    searchNearbyBarbersMock.mockReset();
    searchNearbyBarbersMock.mockResolvedValue({ results: [], queryStatus: 'ok' });
  });

  it('E1. real coordinates are passed through and reported as locationMode "granted"', async () => {
    const data = await customerRepository.searchBarbers('cust-1', '', {
      latitude: -6.9,
      longitude: 107.6,
    });

    expect(searchNearbyBarbersMock).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: -6.9, longitude: 107.6 })
    );
    expect(data?.locationMode).toBe('granted');
  });

  it('E2. omitted coordinates (permission denied/unavailable) fall back to the default area and are reported as "default_area", never "granted"', async () => {
    const data = await customerRepository.searchBarbers('cust-1', '', {});

    const callArgs = searchNearbyBarbersMock.mock.calls[0][0];
    expect(callArgs.latitude).toBeTypeOf('number');
    expect(callArgs.longitude).toBeTypeOf('number');
    expect(data?.locationMode).toBe('default_area');
  });

  it('maps a query-infrastructure failure to queryOutcome "query_failed", distinct from a legitimate zero-result search', async () => {
    searchNearbyBarbersMock.mockResolvedValueOnce({ results: [], queryStatus: 'error' });
    const failed = await customerRepository.searchBarbers('cust-1', '', { latitude: -6.9, longitude: 107.6 });
    expect(failed?.queryOutcome).toBe('query_failed');

    searchNearbyBarbersMock.mockResolvedValueOnce({ results: [], queryStatus: 'ok' });
    const zero = await customerRepository.searchBarbers('cust-1', '', { latitude: -6.9, longitude: 107.6 });
    expect(zero?.queryOutcome).toBe('zero_results');
  });

  it("regression: nearbyBarbers/featured surface each barber's real ratingAverage/reviewCount, not a hardcoded 4.8/12 shown for every barber regardless of actual reviews", async () => {
    searchNearbyBarbersMock.mockResolvedValueOnce({
      results: [
        {
          barber: { barberId: 'barber-1', name: 'Barber One', ratingAverage: 3.2, reviewCount: 7 },
          distanceKm: 1,
          formattedDistance: '~1 km',
        },
        {
          barber: { barberId: 'barber-2', name: 'Barber Two', ratingAverage: 0, reviewCount: 0 },
          distanceKm: 2,
          formattedDistance: '~2 km',
        },
      ],
      queryStatus: 'ok',
    });

    const data = await customerRepository.searchBarbers('cust-1', '', { latitude: -6.9, longitude: 107.6 });

    expect(data?.nearbyBarbers[0]).toMatchObject({ rating: 3.2, reviewCount: 7 });
    expect(data?.nearbyBarbers[1]).toMatchObject({ rating: 0, reviewCount: 0 });
    expect(data?.featuredBarber).toMatchObject({ rating: 3.2, reviewCount: 7 });
  });
});
