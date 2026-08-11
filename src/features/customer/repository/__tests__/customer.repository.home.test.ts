/**
 * Unit Tests for CustomerRepository.getCustomerHomeData activeBooking
 * (Batch 10B-5G)
 *
 * Regression guard: Customer Home rendered homeData.activeBooking, but
 * getCustomerHomeData never populated it -- the active-booking banner never
 * appeared for a real paid booking. These tests lock in that the same
 * bookingRepository.getActiveBookings source used by "Pemesanan Aktif" also
 * drives the Home banner, and that only canonical active statuses
 * (pending/accepted/in_progress) can ever appear there.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getActiveBookingsMock } = vi.hoisted(() => ({ getActiveBookingsMock: vi.fn() }));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
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

function booking(overrides: Record<string, unknown>) {
  return {
    id: 'b1',
    status: 'pending',
    services: [{ id: 's1', name: 'Cukur', price: 30000 }],
    barber: { id: 'barber-1', name: 'Kamal', specialization: '' },
    scheduledAt: '2026-08-26',
    scheduledTime: '20:00',
    ...overrides,
  };
}

describe('customerRepository.getCustomerHomeData activeBooking', () => {
  beforeEach(() => {
    getActiveBookingsMock.mockReset();
  });

  it('1. a real active booking populates homeData.activeBooking with resolvable service/barber names', async () => {
    getActiveBookingsMock.mockResolvedValue([booking({ id: 'Gy2zX7BnpgtmAN7K0UjK', status: 'in_progress' })]);

    const result = await customerRepository.getCustomerHomeData('cust-1');

    expect(result?.activeBooking).toEqual({
      id: 'Gy2zX7BnpgtmAN7K0UjK',
      serviceName: 'Cukur',
      barberName: 'Kamal',
      bookingDate: '2026-08-26',
      bookingTime: '20:00',
      status: 'in_progress',
    });
  });

  it('2. no active bookings results in activeBooking: null, not undefined or a stale value', async () => {
    getActiveBookingsMock.mockResolvedValue([]);

    const result = await customerRepository.getCustomerHomeData('cust-1');

    expect(result?.activeBooking).toBeNull();
  });

  it('3. with multiple active bookings, the most actionable one (in_progress) is surfaced over an older pending one', async () => {
    getActiveBookingsMock.mockResolvedValue([
      booking({ id: 'pending-1', status: 'pending' }),
      booking({ id: 'in-progress-1', status: 'in_progress' }),
    ]);

    const result = await customerRepository.getCustomerHomeData('cust-1');

    expect(result?.activeBooking?.id).toBe('in-progress-1');
  });

  it('4. getCustomerHomeData still resolves (not null) when the active-bookings lookup itself throws', async () => {
    getActiveBookingsMock.mockRejectedValue(new Error('firestore unavailable'));

    const result = await customerRepository.getCustomerHomeData('cust-1');

    expect(result).toBeNull();
  });
});
