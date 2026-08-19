/**
 * Unit tests for barberRepository.getBookingDetail / subscribeToBookingDetail
 * (Barber Service Workspace stabilization pass).
 *
 * Regression guard: the payment-first booking creator (payments.ts
 * handleCreatePayment) only ever persists a single `serviceId` on the
 * booking document, never a `services` array -- so a raw `data.services ||
 * []` read (as getBarberBookings already does) was empty for every real
 * booking, silently leaving the Barber's service name/price/duration blank.
 * These tests lock in that the real service is resolved from
 * barberServices/{serviceId} instead, with a price-only (never a fabricated
 * duration) fallback if that doc is gone.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getDocMock, onSnapshotMock, docMock } = vi.hoisted(() => ({
  getDocMock: vi.fn(),
  onSnapshotMock: vi.fn(),
  docMock: vi.fn((_db: unknown, coll: string, id: string) => ({ __coll: coll, __id: id })),
}));

vi.mock('firebase/firestore', () => ({
  doc: docMock,
  getDoc: getDocMock,
  onSnapshot: onSnapshotMock,
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  collection: vi.fn(),
  Timestamp: { now: () => 'MOCK_TIMESTAMP' },
}));

vi.mock('@/lib/firebase', () => ({ firestore: {} }));
vi.mock('@/lib/promise', () => ({ withTimeout: (p: Promise<unknown>) => p }));
vi.mock('@/features/location/utils/geo.utils', () => ({ getGeohash: vi.fn(), validateCoordinates: vi.fn() }));

import { barberRepository } from '../barber.repository';

function bookingDoc(overrides: Record<string, unknown> = {}) {
  return {
    exists: () => true,
    id: 'booking-1',
    data: () => ({
      barberId: 'barber-1',
      customerId: 'cust-1',
      status: 'accepted',
      price: 50000,
      ...overrides,
    }),
  };
}

function serviceDoc(overrides: Record<string, unknown> = {}) {
  return {
    exists: () => true,
    data: () => ({ name: 'Haircut Premium', price: 50000, durationMinutes: 30, isActive: true, ...overrides }),
  };
}

describe('barberRepository.getBookingDetail -- service resolution', () => {
  beforeEach(() => {
    getDocMock.mockReset();
    docMock.mockClear();
  });

  it('1. a booking with a real services array uses it as-is, never touching barberServices', async () => {
    const realServices = [{ serviceId: 's1', name: 'Cukur', price: 30000, durationMinutes: 20, isActive: true, createdAt: '' }];
    getDocMock.mockImplementation(async (ref: { __coll: string }) => {
      if (ref.__coll === 'bookings') return bookingDoc({ services: realServices });
      throw new Error('should not read barberServices when services[] already exists');
    });

    const result = await barberRepository.getBookingDetail('barber-1', 'booking-1');

    expect(result?.services).toEqual(realServices);
  });

  it('2. no services array + a serviceId resolves the real name/price/duration from barberServices', async () => {
    getDocMock.mockImplementation(async (ref: { __coll: string; __id: string }) => {
      if (ref.__coll === 'bookings') return bookingDoc({ serviceId: 'svc-1', price: 50000 });
      if (ref.__coll === 'barberServices' && ref.__id === 'svc-1') return serviceDoc();
      throw new Error(`unexpected read: ${ref.__coll}`);
    });

    const result = await barberRepository.getBookingDetail('barber-1', 'booking-1');

    expect(result?.services).toEqual([
      expect.objectContaining({ serviceId: 'svc-1', name: 'Haircut Premium', price: 50000, durationMinutes: 30 }),
    ]);
  });

  it('3. missing service doc falls back to a price-only entry -- never a fabricated duration', async () => {
    getDocMock.mockImplementation(async (ref: { __coll: string }) => {
      if (ref.__coll === 'bookings') return bookingDoc({ serviceId: 'svc-deleted', price: 40000 });
      if (ref.__coll === 'barberServices') return { exists: () => false, data: () => undefined };
      throw new Error(`unexpected read: ${ref.__coll}`);
    });

    const result = await barberRepository.getBookingDetail('barber-1', 'booking-1');

    expect(result?.services).toEqual([
      expect.objectContaining({ price: 40000, durationMinutes: 0 }),
    ]);
  });

  it('4. a booking not assigned to this barber returns null (ownership check)', async () => {
    getDocMock.mockResolvedValue(bookingDoc({ barberId: 'someone-else' }));

    const result = await barberRepository.getBookingDetail('barber-1', 'booking-1');

    expect(result).toBeNull();
  });
});

describe('barberRepository.subscribeToBookingDetail', () => {
  beforeEach(() => {
    getDocMock.mockReset();
    onSnapshotMock.mockReset();
    docMock.mockClear();
  });

  it('5. forwards the mapped booking (with resolved services) on every snapshot', async () => {
    getDocMock.mockImplementation(async (ref: { __coll: string; __id: string }) => {
      if (ref.__coll === 'barberServices' && ref.__id === 'svc-1') return serviceDoc();
      throw new Error(`unexpected read: ${ref.__coll}`);
    });

    let capturedCallback: (snap: any) => void = () => {};
    onSnapshotMock.mockImplementation((_ref: unknown, cb: (snap: any) => void) => {
      capturedCallback = cb;
      return () => {};
    });

    const onNext = vi.fn();
    barberRepository.subscribeToBookingDetail('barber-1', 'booking-1', onNext);

    capturedCallback(bookingDoc({ serviceId: 'svc-1' }));
    // The callback resolves the service asynchronously (getDoc) before
    // calling onNext -- flush microtasks.
    await Promise.resolve();
    await Promise.resolve();

    expect(onNext).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: 'booking-1',
        services: [expect.objectContaining({ name: 'Haircut Premium' })],
      })
    );
  });

  it('6. forwards null when the document does not exist', () => {
    let capturedCallback: (snap: any) => void = () => {};
    onSnapshotMock.mockImplementation((_ref: unknown, cb: (snap: any) => void) => {
      capturedCallback = cb;
      return () => {};
    });

    const onNext = vi.fn();
    barberRepository.subscribeToBookingDetail('barber-1', 'booking-1', onNext);
    capturedCallback({ exists: () => false });

    expect(onNext).toHaveBeenCalledWith(null);
  });

  it('7. forwards null when the booking belongs to a different barber', () => {
    let capturedCallback: (snap: any) => void = () => {};
    onSnapshotMock.mockImplementation((_ref: unknown, cb: (snap: any) => void) => {
      capturedCallback = cb;
      return () => {};
    });

    const onNext = vi.fn();
    barberRepository.subscribeToBookingDetail('barber-1', 'booking-1', onNext);
    capturedCallback(bookingDoc({ barberId: 'someone-else' }));

    expect(onNext).toHaveBeenCalledWith(null);
  });

  it('8. immediately calls back with null and never subscribes when ids are empty', () => {
    const onNext = vi.fn();
    const unsubscribe = barberRepository.subscribeToBookingDetail('', 'booking-1', onNext);

    expect(onNext).toHaveBeenCalledWith(null);
    expect(onSnapshotMock).not.toHaveBeenCalled();
    expect(() => unsubscribe()).not.toThrow();
  });
});
