/**
 * Unit tests for barberRepository.getBarberBookings -- service metadata
 * resolution in the Barber booking list (P0/P1 cleanup after the Service
 * Workspace pass).
 *
 * Regression guard: the payment-first booking creator only ever persists a
 * single `serviceId` on the booking document, never a `services` array, so
 * this function's previous `services: data.services || []` read was empty
 * for every real booking -- silently leaving the Barber booking list's
 * service name/price/duration blank even though the booking detail/
 * workspace screen had already been fixed to resolve it correctly. This now
 * reuses the exact same canonical resolveBarberBookingServices used by
 * getBookingDetail/subscribeToBookingDetail -- no second mapper, no
 * duplicated business logic.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getDocMock, getDocsMock, docMock } = vi.hoisted(() => ({
  getDocMock: vi.fn(),
  getDocsMock: vi.fn(),
  docMock: vi.fn((_db: unknown, coll: string, id: string) => ({ __coll: coll, __id: id })),
}));

vi.mock('firebase/firestore', () => ({
  doc: docMock,
  getDoc: getDocMock,
  getDocs: getDocsMock,
  onSnapshot: vi.fn(),
  addDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  query: vi.fn((...args: unknown[]) => args),
  where: vi.fn((...args: unknown[]) => args),
  collection: vi.fn((_db: unknown, name: string) => name),
  Timestamp: { now: () => 'MOCK_TIMESTAMP' },
}));

vi.mock('@/lib/firebase', () => ({ firestore: {} }));
vi.mock('@/lib/promise', () => ({ withTimeout: (p: Promise<unknown>) => p }));
vi.mock('@/features/location/utils/geo.utils', () => ({ getGeohash: vi.fn(), validateCoordinates: vi.fn() }));

import { barberRepository } from '../barber.repository';

function bookingsSnapshot(rows: Array<{ id: string; data: Record<string, unknown> }>) {
  return {
    docs: rows.map((r) => ({ id: r.id, data: () => r.data })),
  };
}

function baseBookingData(overrides: Record<string, unknown> = {}) {
  return {
    barberId: 'barber-1',
    customerId: 'cust-1',
    status: 'accepted',
    paymentStatus: 'paid',
    price: 50000,
    date: '2026-08-19',
    startTime: '10:00',
    ...overrides,
  };
}

describe('barberRepository.getBarberBookings -- service resolution', () => {
  beforeEach(() => {
    getDocMock.mockReset();
    getDocsMock.mockReset();
    docMock.mockClear();
  });

  it('1. a real (serviceId-only) booking resolves the actual service name/price/duration, not a blank entry', async () => {
    getDocsMock.mockResolvedValue(bookingsSnapshot([{ id: 'booking-1', data: baseBookingData({ serviceId: 'svc-1' }) }]));
    getDocMock.mockImplementation(async (ref: { __coll: string; __id: string }) => {
      if (ref.__coll === 'customers') return { exists: () => true, data: () => ({ name: 'Budi' }) };
      if (ref.__coll === 'barberServices' && ref.__id === 'svc-1') {
        return { exists: () => true, data: () => ({ name: 'Haircut Premium', price: 50000, durationMinutes: 30, isActive: true }) };
      }
      throw new Error(`unexpected getDoc read: ${ref.__coll}/${ref.__id}`);
    });

    const [booking] = await barberRepository.getBarberBookings('barber-1');

    expect(booking.services).toEqual([
      expect.objectContaining({ serviceId: 'svc-1', name: 'Haircut Premium', price: 50000, durationMinutes: 30 }),
    ]);
  });

  it('2. a legacy booking that genuinely carries a services[] array is used as-is, never overwritten', async () => {
    const legacyServices = [{ serviceId: 's1', name: 'Cukur Klasik', price: 25000, durationMinutes: 15, isActive: true, createdAt: '' }];
    getDocsMock.mockResolvedValue(bookingsSnapshot([{ id: 'booking-legacy', data: baseBookingData({ services: legacyServices }) }]));
    getDocMock.mockImplementation(async (ref: { __coll: string }) => {
      if (ref.__coll === 'customers') return { exists: () => true, data: () => ({ name: 'Budi' }) };
      throw new Error(`should not read barberServices when services[] already exists: ${ref.__coll}`);
    });

    const [booking] = await barberRepository.getBarberBookings('barber-1');

    expect(booking.services).toEqual(legacyServices);
  });

  it('3. a missing/deleted service document falls back to a safe price-only entry -- no crash, no fabricated duration', async () => {
    getDocsMock.mockResolvedValue(bookingsSnapshot([{ id: 'booking-orphan', data: baseBookingData({ serviceId: 'svc-deleted', price: 40000 }) }]));
    getDocMock.mockImplementation(async (ref: { __coll: string }) => {
      if (ref.__coll === 'customers') return { exists: () => true, data: () => ({ name: 'Budi' }) };
      if (ref.__coll === 'barberServices') return { exists: () => false, data: () => undefined };
      throw new Error(`unexpected getDoc read: ${ref.__coll}`);
    });

    const result = await barberRepository.getBarberBookings('barber-1');

    expect(result).toHaveLength(1);
    expect(result[0].services).toEqual([
      expect.objectContaining({ price: 40000, durationMinutes: 0 }),
    ]);
  });

  it('4. multiple bookings each resolve their own service independently', async () => {
    getDocsMock.mockResolvedValue(
      bookingsSnapshot([
        { id: 'booking-a', data: baseBookingData({ serviceId: 'svc-a', price: 30000 }) },
        { id: 'booking-b', data: baseBookingData({ serviceId: 'svc-b', price: 60000 }) },
      ])
    );
    getDocMock.mockImplementation(async (ref: { __coll: string; __id: string }) => {
      if (ref.__coll === 'customers') return { exists: () => true, data: () => ({ name: 'Budi' }) };
      if (ref.__coll === 'barberServices' && ref.__id === 'svc-a') {
        return { exists: () => true, data: () => ({ name: 'Cukur A', price: 30000, durationMinutes: 20, isActive: true }) };
      }
      if (ref.__coll === 'barberServices' && ref.__id === 'svc-b') {
        return { exists: () => true, data: () => ({ name: 'Cukur B', price: 60000, durationMinutes: 45, isActive: true }) };
      }
      throw new Error(`unexpected getDoc read: ${ref.__coll}/${ref.__id}`);
    });

    const result = await barberRepository.getBarberBookings('barber-1');

    expect(result.find((b) => b.bookingId === 'booking-a')?.services[0]).toEqual(
      expect.objectContaining({ name: 'Cukur A', durationMinutes: 20 })
    );
    expect(result.find((b) => b.bookingId === 'booking-b')?.services[0]).toEqual(
      expect.objectContaining({ name: 'Cukur B', durationMinutes: 45 })
    );
  });
});
