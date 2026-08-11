/**
 * Unit Tests for BookingRepository.getActiveBookings/getBookingHistory/
 * getBookingDetail (Batch 10B-5G)
 *
 * Regression guard: booking/history.tsx previously always queried a hardcoded
 * MOCK_CUSTOMER_ID = 'CUST001', so a real authenticated customer's bookings
 * never matched the `where('customerId', '==', ...)` filter and "Pemesanan
 * Aktif" was always empty. These tests lock in that the real customerId
 * argument reaches the query, and that each raw bookings/{id} document is
 * resolved (via barbers/{barberId} and barberServices/{serviceId}) into the
 * canonical Booking domain shape BookingCard/the detail screen require --
 * see map-booking.test.ts for the pure-mapping-logic coverage.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getDocMock, getDocsMock, whereMock } = vi.hoisted(() => ({
  getDocMock: vi.fn(),
  getDocsMock: vi.fn(),
  whereMock: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: unknown, coll: string, id: string) => ({ __coll: coll, __id: id })),
  getDoc: (...args: unknown[]) => getDocMock(...args),
  getDocs: (...args: unknown[]) => getDocsMock(...args),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  runTransaction: vi.fn(),
  query: vi.fn((..._args: unknown[]) => 'MOCK_QUERY'),
  where: (...args: unknown[]) => whereMock(...args),
  collection: vi.fn(),
  Timestamp: class FakeTimestamp {
    constructor(private readonly date: Date) {}
    toDate() {
      return this.date;
    }
  },
}));

vi.mock('@/lib/firebase', () => ({ firestore: {} }));

import { bookingRepository } from '../booking.repository';

const BARBER_DOC = { shopName: 'Kamal', address: 'karpaw', ratingAverage: 4.5 };
const SERVICE_DOC = { name: 'Cukur', price: 30000, durationMinutes: 30 };

function mockDocResolvers(opts: { barbers?: Record<string, unknown>; services?: Record<string, unknown> }) {
  getDocMock.mockImplementation(async (ref: { __coll: string; __id: string }) => {
    const data = ref.__coll === 'barbers' ? opts.barbers?.[ref.__id] : opts.services?.[ref.__id];
    return { exists: () => Boolean(data), data: () => data };
  });
}

function mockBookingsSnapshot(docs: { id: string; data: Record<string, unknown> }[]) {
  getDocsMock.mockResolvedValue({ docs: docs.map((d) => ({ id: d.id, data: () => d.data })) });
}

describe('bookingRepository.getActiveBookings', () => {
  beforeEach(() => {
    getDocMock.mockReset();
    getDocsMock.mockReset();
    whereMock.mockReset();
    mockDocResolvers({ barbers: { 'barber-1': BARBER_DOC }, services: { 'svc-1': SERVICE_DOC } });
  });

  it('1. the real authenticated customer UID is passed into the customerId query filter, not a hardcoded value', async () => {
    mockBookingsSnapshot([]);

    await bookingRepository.getActiveBookings('real-firebase-uid-123');

    expect(whereMock).toHaveBeenCalledWith('customerId', '==', 'real-firebase-uid-123');
    expect(whereMock).toHaveBeenCalledWith('status', 'in', ['pending', 'accepted', 'in_progress']);
  });

  it('2. an empty customerId short-circuits without calling Firestore', async () => {
    const result = await bookingRepository.getActiveBookings('');

    expect(result).toEqual([]);
    expect(getDocsMock).not.toHaveBeenCalled();
  });

  it('3. a real active booking resolves shop/barber identity from the barbers doc, not undefined', async () => {
    mockBookingsSnapshot([
      { id: 'Gy2zX7BnpgtmAN7K0UjK', data: { customerId: 'cust-1', barberId: 'barber-1', serviceId: 'svc-1', date: '2026-08-26', startTime: '20:00', price: 30000, status: 'in_progress', paymentStatus: 'paid' } },
    ]);

    const result = await bookingRepository.getActiveBookings('cust-1');

    expect(result).toHaveLength(1);
    expect(result[0].shop.name).toBe('Kamal');
    expect(result[0].shop.imageUrl).toBeDefined();
    expect(result[0].services[0].name).toBe('Cukur');
    expect(result[0].status).toBe('in_progress');
  });

  it('4. a Firestore query failure is caught and returns an empty list rather than throwing', async () => {
    getDocsMock.mockRejectedValue(Object.assign(new Error('failed-precondition'), { code: 'failed-precondition' }));

    const result = await bookingRepository.getActiveBookings('cust-1');

    expect(result).toEqual([]);
  });
});

describe('bookingRepository.getBookingHistory', () => {
  beforeEach(() => {
    getDocMock.mockReset();
    getDocsMock.mockReset();
    whereMock.mockReset();
    mockDocResolvers({ barbers: { 'barber-1': BARBER_DOC }, services: {} });
  });

  it('5. queries the canonical terminal statuses for the real customer UID', async () => {
    mockBookingsSnapshot([]);

    await bookingRepository.getBookingHistory('real-firebase-uid-123');

    expect(whereMock).toHaveBeenCalledWith('customerId', '==', 'real-firebase-uid-123');
    expect(whereMock).toHaveBeenCalledWith('status', 'in', ['completed', 'cancelled', 'rejected']);
  });

  it('6. a completed booking maps through with status "completed" intact', async () => {
    mockBookingsSnapshot([
      { id: 'b1', data: { customerId: 'cust-1', barberId: 'barber-1', status: 'completed', paymentStatus: 'paid', totalPrice: 30000 } },
    ]);

    const result = await bookingRepository.getBookingHistory('cust-1');

    expect(result[0].status).toBe('completed');
  });
});

describe('bookingRepository.getBookingDetail', () => {
  beforeEach(() => {
    getDocMock.mockReset();
    whereMock.mockReset();
  });

  it('7. resolves a single booking with barber identity populated', async () => {
    getDocMock.mockImplementation(async (ref: { __coll: string; __id: string }) => {
      if (ref.__coll === 'bookings') {
        return {
          exists: () => true,
          id: ref.__id,
          data: () => ({ customerId: 'cust-1', barberId: 'barber-1', status: 'pending', paymentStatus: 'paid', date: '2026-08-26', startTime: '20:00', price: 30000 }),
        };
      }
      if (ref.__coll === 'barbers') return { exists: () => true, data: () => BARBER_DOC };
      return { exists: () => false, data: () => undefined };
    });

    const result = await bookingRepository.getBookingDetail('Gy2zX7BnpgtmAN7K0UjK');

    expect(result).not.toBeNull();
    expect(result?.shop.name).toBe('Kamal');
    expect(result?.scheduledAt).toBe('2026-08-26');
  });

  it('8. a nonexistent booking returns null', async () => {
    getDocMock.mockResolvedValue({ exists: () => false });

    const result = await bookingRepository.getBookingDetail('missing');

    expect(result).toBeNull();
  });
});
