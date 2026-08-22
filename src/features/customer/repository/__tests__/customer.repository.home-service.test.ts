/**
 * Regression guard for the Home Service availability toggle (thesis v1.1
 * final stabilization): getPublicBarbers must preserve an explicit
 * acceptsHomeService: false from Firestore (no `|| true`/coercion bug that
 * would silently flip it back to true), and getCustomerHomeData's
 * homeServiceBarbers section must exclude a barber who has turned it off
 * while still keeping them in the general (rating-led) barbers list.
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
const getActiveBookingsMock = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({ __collection: 'ref' })),
  query: vi.fn((_ref: unknown, ...clauses: WhereClause[]): QueryDescriptor => ({ clauses })),
  where: vi.fn((field: string, op: string, value: unknown): WhereClause => ({ field, op, value })),
  getDoc: vi.fn(),
  getDocs: (q: QueryDescriptor) => getDocsMock(q),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  updateDoc: vi.fn(),
  doc: vi.fn(),
  Timestamp: { now: () => ({ toDate: () => new Date() }) },
}));

vi.mock('@/lib/firebase', () => ({
  firestore: {},
  firebaseAuth: { currentUser: { displayName: 'Test User', email: 'test@example.com', photoURL: null } },
}));

vi.mock('@/lib/promise', () => ({ withTimeout: (p: Promise<unknown>) => p }));

vi.mock('@/features/bookings/repository/booking.repository', () => ({
  bookingRepository: { getActiveBookings: (...args: unknown[]) => getActiveBookingsMock(...args) },
}));

import { customerRepository } from '../customer.repository';

function hasClause(q: QueryDescriptor, field: string) {
  return q.clauses.some((c) => c.field === field);
}

function barberDocsSnapshot(barbers: Array<{ id: string; data: Record<string, unknown> }>) {
  return { docs: barbers.map((b) => ({ id: b.id, data: () => b.data })) };
}

function baseBarber(overrides: Record<string, unknown> = {}) {
  return {
    listingStatus: 'active',
    verified: true,
    displayName: 'Test Barber',
    ratingAverage: 4.5,
    reviewCount: 10,
    ...overrides,
  };
}

function mockBarbersAndEmptyCategories(barbers: Array<{ id: string; data: Record<string, unknown> }>) {
  getDocsMock.mockImplementation((q: QueryDescriptor) => {
    if (hasClause(q, 'listingStatus')) {
      return Promise.resolve(barberDocsSnapshot(barbers));
    }
    // categories query (where('active', '==', true), no listingStatus clause)
    return Promise.resolve({ docs: [] });
  });
}

describe('customerRepository.getPublicBarbers acceptsHomeService mapping', () => {
  beforeEach(() => {
    getDocsMock.mockReset();
    getActiveBookingsMock.mockReset();
    getActiveBookingsMock.mockResolvedValue([]);
  });

  it('preserves an explicit acceptsHomeService: false from Firestore', async () => {
    mockBarbersAndEmptyCategories([{ id: 'off', data: baseBarber({ acceptsHomeService: false }) }]);

    const barbers = await customerRepository.getPublicBarbers();

    expect(barbers.find((b) => b.id === 'off')?.acceptsHomeService).toBe(false);
  });

  it('preserves an explicit acceptsHomeService: true from Firestore', async () => {
    mockBarbersAndEmptyCategories([{ id: 'on', data: baseBarber({ acceptsHomeService: true }) }]);

    const barbers = await customerRepository.getPublicBarbers();

    expect(barbers.find((b) => b.id === 'on')?.acceptsHomeService).toBe(true);
  });

  it('defaults to true when acceptsHomeService is missing (legacy barber)', async () => {
    mockBarbersAndEmptyCategories([{ id: 'legacy', data: baseBarber() }]);

    const barbers = await customerRepository.getPublicBarbers();

    expect(barbers.find((b) => b.id === 'legacy')?.acceptsHomeService).toBe(true);
  });
});

describe('customerRepository.getCustomerHomeData homeServiceBarbers filter', () => {
  beforeEach(() => {
    getDocsMock.mockReset();
    getActiveBookingsMock.mockReset();
    getActiveBookingsMock.mockResolvedValue([]);
  });

  it('excludes a barber with acceptsHomeService: false from homeServiceBarbers, but keeps them discoverable generally', async () => {
    mockBarbersAndEmptyCategories([
      { id: 'off', data: baseBarber({ acceptsHomeService: false }) },
      { id: 'on', data: baseBarber({ acceptsHomeService: true }) },
    ]);

    const result = await customerRepository.getCustomerHomeData('cust-1');

    expect((result?.homeServiceBarbers ?? []).map((b) => b.barberId)).toEqual(['on']);
    expect((result?.homeServiceBarbers ?? []).map((b) => b.barberId)).not.toContain('off');
  });

  it('a legacy barber (missing acceptsHomeService) still appears in homeServiceBarbers', async () => {
    mockBarbersAndEmptyCategories([{ id: 'legacy', data: baseBarber() }]);

    const result = await customerRepository.getCustomerHomeData('cust-1');

    expect((result?.homeServiceBarbers ?? []).map((b) => b.barberId)).toEqual(['legacy']);
  });
});
