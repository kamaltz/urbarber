/**
 * Unit Tests for Discovery Service (Batch 10B-4)
 * Regression guard for the confirmed listingStatus !== 'public' bug (canonical
 * discoverable value is 'active') and for distinguishing a genuine missing-index
 * query failure from a legitimate zero-result search.
 *
 * geo.utils (Haversine + geohash bounds) runs for real here -- only the Firestore
 * SDK calls (collection/query/where/getDocs) are mocked, via a lightweight
 * descriptor object that records the where() clauses passed to each query so each
 * test can decide what that specific query call should return.
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

// Garut center used across tests; each barber doc is placed at a small real offset.
const CENTER = { latitude: -7.2278, longitude: 107.9087 };
const NEAR = { latitude: -7.2295, longitude: 107.9073 }; // ~2km away
const FAR = { latitude: -6.9, longitude: 107.6 }; // well outside a 25km search

function approvedActiveBarber(overrides: Record<string, unknown> = {}) {
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

describe('discoveryService.searchNearbyBarbers', () => {
  beforeEach(() => {
    getDocsMock.mockReset();
  });

  it('A. an active approved barber within radius is accepted (regression guard for the listingStatus !== "public" bug)', async () => {
    getDocsMock.mockImplementation((q: QueryDescriptor) => {
      if (hasClause(q, 'geohash')) {
        return Promise.resolve(snapshotOf([{ id: 'barber-1', data: approvedActiveBarber() }]));
      }
      return Promise.resolve(snapshotOf([]));
    });

    const { results, queryStatus } = await discoveryService.searchNearbyBarbers({
      latitude: CENTER.latitude,
      longitude: CENTER.longitude,
      radiusKm: 25,
    });

    expect(queryStatus).toBe('ok');
    expect(results).toHaveLength(1);
    expect(results[0].barber.barberId).toBe('barber-1');
  });

  it('B. an inactive barber reached via the unfiltered last-resort scan is excluded client-side', async () => {
    getDocsMock.mockImplementation((q: QueryDescriptor) => {
      if (hasClause(q, 'geohash')) {
        return Promise.reject(Object.assign(new Error('FAILED_PRECONDITION'), { code: 'failed-precondition' }));
      }
      if (hasClause(q, 'listingStatus')) {
        return Promise.reject(new Error('unexpected filtered query in this scenario'));
      }
      // Unfiltered generic scan -- returns every doc regardless of status.
      return Promise.resolve(
        snapshotOf([
          { id: 'active-barber', data: approvedActiveBarber() },
          { id: 'inactive-barber', data: approvedActiveBarber({ listingStatus: 'inactive' }) },
        ])
      );
    });

    const { results } = await discoveryService.searchNearbyBarbers({
      latitude: CENTER.latitude,
      longitude: CENTER.longitude,
      radiusKm: 25,
    });

    const ids = results.map((r) => r.barber.barberId);
    expect(ids).toContain('active-barber');
    expect(ids).not.toContain('inactive-barber');
  });

  it('C. a pending-verification barber reached via the last-resort scan is excluded client-side', async () => {
    getDocsMock.mockImplementation((q: QueryDescriptor) => {
      if (hasClause(q, 'geohash')) {
        return Promise.reject(new Error('FAILED_PRECONDITION'));
      }
      if (hasClause(q, 'listingStatus')) {
        return Promise.reject(new Error('unexpected filtered query in this scenario'));
      }
      return Promise.resolve(
        snapshotOf([
          { id: 'approved-barber', data: approvedActiveBarber() },
          { id: 'pending-barber', data: approvedActiveBarber({ verificationStatus: 'pending' }) },
          { id: 'rejected-barber', data: approvedActiveBarber({ verificationStatus: 'rejected' }) },
        ])
      );
    });

    const { results } = await discoveryService.searchNearbyBarbers({
      latitude: CENTER.latitude,
      longitude: CENTER.longitude,
      radiusKm: 25,
    });

    const ids = results.map((r) => r.barber.barberId);
    expect(ids).toEqual(['approved-barber']);
  });

  it('canonical invariant: verified:false is excluded even when approved + active + accepting (verified is not in any Firestore where clause, so this is enforced entirely client-side)', async () => {
    getDocsMock.mockImplementation((q: QueryDescriptor) => {
      if (hasClause(q, 'geohash')) {
        return Promise.resolve(
          snapshotOf([
            { id: 'verified-barber', data: approvedActiveBarber({ verified: true }) },
            { id: 'unverified-barber', data: approvedActiveBarber({ verified: false }) },
          ])
        );
      }
      return Promise.resolve(snapshotOf([]));
    });

    const { results } = await discoveryService.searchNearbyBarbers({
      latitude: CENTER.latitude,
      longitude: CENTER.longitude,
      radiusKm: 25,
    });

    const ids = results.map((r) => r.barber.barberId);
    expect(ids).toEqual(['verified-barber']);
  });

  it('canonical invariant: verified missing (not explicitly true) is excluded, fail-closed', async () => {
    getDocsMock.mockImplementation((q: QueryDescriptor) => {
      if (hasClause(q, 'geohash')) {
        const data = approvedActiveBarber();
        delete (data as Record<string, unknown>).verified;
        return Promise.resolve(snapshotOf([{ id: 'no-verified-field', data }]));
      }
      return Promise.resolve(snapshotOf([]));
    });

    const { results } = await discoveryService.searchNearbyBarbers({
      latitude: CENTER.latitude,
      longitude: CENTER.longitude,
      radiusKm: 25,
    });

    expect(results).toEqual([]);
  });

  it('canonical invariant: listingStatus missing (not explicitly active) is excluded, fail-closed', async () => {
    getDocsMock.mockImplementation((q: QueryDescriptor) => {
      if (hasClause(q, 'geohash')) {
        const data = approvedActiveBarber();
        delete (data as Record<string, unknown>).listingStatus;
        return Promise.resolve(snapshotOf([{ id: 'no-listing-status-field', data }]));
      }
      return Promise.resolve(snapshotOf([]));
    });

    const { results } = await discoveryService.searchNearbyBarbers({
      latitude: CENTER.latitude,
      longitude: CENTER.longitude,
      radiusKm: 25,
    });

    expect(results).toEqual([]);
  });

  it('canonical invariant: a suspended barber reached via the last-resort scan is excluded client-side', async () => {
    getDocsMock.mockImplementation((q: QueryDescriptor) => {
      if (hasClause(q, 'geohash')) {
        return Promise.reject(new Error('FAILED_PRECONDITION'));
      }
      if (hasClause(q, 'listingStatus')) {
        return Promise.reject(new Error('unexpected filtered query in this scenario'));
      }
      return Promise.resolve(
        snapshotOf([
          { id: 'active-barber', data: approvedActiveBarber() },
          { id: 'suspended-barber', data: approvedActiveBarber({ listingStatus: 'suspended' }) },
        ])
      );
    });

    const { results } = await discoveryService.searchNearbyBarbers({
      latitude: CENTER.latitude,
      longitude: CENTER.longitude,
      radiusKm: 25,
    });

    const ids = results.map((r) => r.barber.barberId);
    expect(ids).toEqual(['active-barber']);
  });

  it('canonical invariant: listingStatus=inactive + acceptingNewBookings=true is still not discoverable', async () => {
    getDocsMock.mockImplementation((q: QueryDescriptor) => {
      if (hasClause(q, 'geohash')) {
        // Firestore itself filters listingStatus=='active' at the query level -- an
        // 'inactive' doc is never returned here, matching real behavior.
        return Promise.resolve(snapshotOf([]));
      }
      return Promise.resolve(snapshotOf([]));
    });

    const { results } = await discoveryService.searchNearbyBarbers({
      latitude: CENTER.latitude,
      longitude: CENTER.longitude,
      radiusKm: 25,
    });

    expect(results).toEqual([]);
  });

  it('canonical invariant: listingStatus=suspended + acceptingNewBookings=true is still not discoverable', async () => {
    getDocsMock.mockImplementation((q: QueryDescriptor) => {
      if (hasClause(q, 'geohash')) {
        return Promise.resolve(snapshotOf([]));
      }
      return Promise.resolve(snapshotOf([]));
    });

    const { results } = await discoveryService.searchNearbyBarbers({
      latitude: CENTER.latitude,
      longitude: CENTER.longitude,
      radiusKm: 25,
    });

    expect(results).toEqual([]);
  });

  it('canonical invariant: approved + verified + active with acceptingNewBookings=false is excluded from discovery', async () => {
    getDocsMock.mockImplementation((q: QueryDescriptor) => {
      if (hasClause(q, 'geohash')) {
        return Promise.resolve(
          snapshotOf([{ id: 'closed-barber', data: approvedActiveBarber({ verified: true, acceptingNewBookings: false }) }])
        );
      }
      return Promise.resolve(snapshotOf([]));
    });

    const { results } = await discoveryService.searchNearbyBarbers({
      latitude: CENTER.latitude,
      longitude: CENTER.longitude,
      radiusKm: 25,
    });

    expect(results).toEqual([]);
  });

  it('F. geohash candidates are filtered by actual Haversine distance, not the geohash bound alone', async () => {
    getDocsMock.mockImplementation((q: QueryDescriptor) => {
      if (hasClause(q, 'geohash')) {
        // Simulate a wide geohash bound returning a false-positive candidate far outside the radius.
        return Promise.resolve(
          snapshotOf([
            { id: 'in-radius', data: approvedActiveBarber({ location: NEAR }) },
            { id: 'out-of-radius', data: approvedActiveBarber({ location: FAR }) },
          ])
        );
      }
      return Promise.resolve(snapshotOf([]));
    });

    const { results } = await discoveryService.searchNearbyBarbers({
      latitude: CENTER.latitude,
      longitude: CENTER.longitude,
      radiusKm: 25,
    });

    const ids = results.map((r) => r.barber.barberId);
    expect(ids).toEqual(['in-radius']);
  });

  it('G. results are sorted nearest-first', async () => {
    const near = NEAR; // ~2km
    const mid = { latitude: -7.28, longitude: 107.95 }; // farther than NEAR, within 25km
    getDocsMock.mockImplementation((q: QueryDescriptor) => {
      if (hasClause(q, 'geohash')) {
        return Promise.resolve(
          snapshotOf([
            { id: 'mid', data: approvedActiveBarber({ location: mid }) },
            { id: 'near', data: approvedActiveBarber({ location: near }) },
          ])
        );
      }
      return Promise.resolve(snapshotOf([]));
    });

    const { results } = await discoveryService.searchNearbyBarbers({
      latitude: CENTER.latitude,
      longitude: CENTER.longitude,
      radiusKm: 25,
    });

    expect(results.map((r) => r.barber.barberId)).toEqual(['near', 'mid']);
    expect(results[0].distanceKm).toBeLessThan(results[1].distanceKm);
  });

  it('H. zero eligible barbers is a valid, successful query result (not an error)', async () => {
    getDocsMock.mockResolvedValue(snapshotOf([]));

    const { results, queryStatus } = await discoveryService.searchNearbyBarbers({
      latitude: CENTER.latitude,
      longitude: CENTER.longitude,
      radiusKm: 25,
    });

    expect(queryStatus).toBe('ok');
    expect(results).toEqual([]);
  });

  it('I1. a primary geohash query failure (missing index) that recovers via fallback is distinguishable from both "ok" and "error"', async () => {
    getDocsMock.mockImplementation((q: QueryDescriptor) => {
      if (hasClause(q, 'geohash')) {
        return Promise.reject(Object.assign(new Error('The query requires an index'), { code: 'failed-precondition' }));
      }
      // Fallback (verificationStatus + listingStatus, no geohash) succeeds.
      return Promise.resolve(snapshotOf([{ id: 'barber-1', data: approvedActiveBarber() }]));
    });

    const { results, queryStatus } = await discoveryService.searchNearbyBarbers({
      latitude: CENTER.latitude,
      longitude: CENTER.longitude,
      radiusKm: 25,
    });

    expect(queryStatus).toBe('primary_query_failed');
    expect(results).toHaveLength(1);
  });

  it('I2. total query failure (every path throws) is reported as "error", not a silent zero result', async () => {
    getDocsMock.mockRejectedValue(new Error('network unavailable'));

    const { results, queryStatus } = await discoveryService.searchNearbyBarbers({
      latitude: CENTER.latitude,
      longitude: CENTER.longitude,
      radiusKm: 25,
    });

    expect(queryStatus).toBe('error');
    expect(results).toEqual([]);
  });

  it('rejects invalid coordinates without issuing any Firestore query', async () => {
    const { results, queryStatus } = await discoveryService.searchNearbyBarbers({
      latitude: 999,
      longitude: 999,
    });

    expect(queryStatus).toBe('error');
    expect(results).toEqual([]);
    expect(getDocsMock).not.toHaveBeenCalled();
  });
});
