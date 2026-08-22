/**
 * Regression guard for the Home Service availability toggle (thesis v1.1
 * final stabilization): a Barber turning acceptsHomeService off must be
 * excluded from a serviceType:'customer_home' search, while an explicit
 * true or a legacy missing field must still pass through. This locks in
 * discoveryService's filter alongside customerRepository's (see
 * customer.repository.home-service.test.ts) so the two mappers can never
 * silently diverge.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

interface WhereClause {
  field: string;
  op: string;
  value: unknown;
}

interface QueryDescriptor {
  clauses: WhereClause[];
}

const getDocsMock = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({ __collection: 'barbers' })),
  where: vi.fn((field: string, op: string, value: unknown): WhereClause => ({ field, op, value })),
  query: vi.fn((_ref: unknown, ...clauses: WhereClause[]): QueryDescriptor => ({ clauses })),
  getDocs: (q: QueryDescriptor) => getDocsMock(q),
}));

vi.mock('@/lib/firebase', () => ({ firestore: {} }));

import { discoveryService } from '../discovery.service';

function snapshotOf(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  return { docs: docs.map((d) => ({ id: d.id, data: () => d.data })) };
}

function hasClause(q: QueryDescriptor, field: string) {
  return q.clauses.some((c) => c.field === field);
}

const CENTER = { latitude: -7.2278, longitude: 107.9087 };
const NEAR = { latitude: -7.2295, longitude: 107.9073 };

function eligibleBarber(overrides: Record<string, unknown> = {}) {
  return {
    verificationStatus: 'approved',
    verified: true,
    listingStatus: 'active',
    acceptingNewBookings: true,
    location: NEAR,
    displayName: 'Test Barber',
    shopAddress: 'Jl. Test',
    ...overrides,
  };
}

async function searchHomeService(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  getDocsMock.mockImplementation((q: QueryDescriptor) => {
    if (hasClause(q, 'geohash')) return Promise.resolve(snapshotOf(docs));
    return Promise.resolve(snapshotOf([]));
  });

  return discoveryService.searchNearbyBarbers({
    latitude: CENTER.latitude,
    longitude: CENTER.longitude,
    radiusKm: 25,
    serviceType: 'customer_home',
  });
}

describe('discoveryService.searchNearbyBarbers Home Service toggle (serviceType: customer_home)', () => {
  beforeEach(() => {
    getDocsMock.mockReset();
  });

  it('acceptsHomeService: true is included', async () => {
    const { results } = await searchHomeService([
      { id: 'on', data: eligibleBarber({ acceptsHomeService: true }) },
    ]);
    expect(results.map((r) => r.barber.barberId)).toEqual(['on']);
  });

  it('acceptsHomeService: false is excluded from a Home Service search, even though it stays a valid barber otherwise', async () => {
    const { results } = await searchHomeService([
      { id: 'off', data: eligibleBarber({ acceptsHomeService: false }) },
    ]);
    expect(results).toEqual([]);
  });

  it('acceptsHomeService missing defaults to eligible (legacy barber predating the field)', async () => {
    const data = eligibleBarber();
    delete (data as Record<string, unknown>).acceptsHomeService;
    const { results } = await searchHomeService([{ id: 'legacy', data }]);
    expect(results.map((r) => r.barber.barberId)).toEqual(['legacy']);
  });

  it('a mix of on/off barbers only surfaces the ones still accepting Home Service', async () => {
    const { results } = await searchHomeService([
      { id: 'on', data: eligibleBarber({ acceptsHomeService: true }) },
      { id: 'off', data: eligibleBarber({ acceptsHomeService: false }) },
    ]);
    expect(results.map((r) => r.barber.barberId)).toEqual(['on']);
  });

  it('acceptsHomeService: false does not affect a plain (non Home Service) search -- the barber still appears', async () => {
    getDocsMock.mockImplementation((q: QueryDescriptor) => {
      if (hasClause(q, 'geohash')) {
        return Promise.resolve(snapshotOf([{ id: 'off', data: eligibleBarber({ acceptsHomeService: false }) }]));
      }
      return Promise.resolve(snapshotOf([]));
    });

    const { results } = await discoveryService.searchNearbyBarbers({
      latitude: CENTER.latitude,
      longitude: CENTER.longitude,
      radiusKm: 25,
    });

    expect(results.map((r) => r.barber.barberId)).toEqual(['off']);
  });

  it('mapped NearbyBarberResult.barber.acceptsHomeService preserves an explicit false (no || true / ?? true-style coercion bug)', async () => {
    const { results } = await searchHomeService([]);
    expect(results).toEqual([]);

    // Exercise the mapper directly via the non-filtered (barbershop-visible) path.
    getDocsMock.mockImplementation((q: QueryDescriptor) => {
      if (hasClause(q, 'geohash')) {
        return Promise.resolve(snapshotOf([{ id: 'off', data: eligibleBarber({ acceptsHomeService: false }) }]));
      }
      return Promise.resolve(snapshotOf([]));
    });
    const plain = await discoveryService.searchNearbyBarbers({
      latitude: CENTER.latitude,
      longitude: CENTER.longitude,
      radiusKm: 25,
    });
    expect(plain.results[0].barber.acceptsHomeService).toBe(false);
  });
});
