/**
 * Unit tests for BookingRepository.cancelBooking (Home/Auth/Refund
 * stabilization pass).
 *
 * Regression guard: this used to write `status: 'cancelled'` directly to
 * Firestore via updateDoc(), bypassing POST /api/bookings/cancel entirely --
 * so a real cancellation never set refundRequired, never restored voucher
 * usage, and never released the slot lock, even though the backend endpoint
 * (payment-api.service.ts) already implemented all of that. These tests lock
 * in that cancelBooking now always routes through that endpoint for any
 * cancellable booking, and passes its refund summary back to the caller.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getDocMock, cancelBookingPaymentMock } = vi.hoisted(() => ({
  getDocMock: vi.fn(),
  cancelBookingPaymentMock: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: unknown, coll: string, id: string) => ({ __coll: coll, __id: id })),
  getDoc: (...args: unknown[]) => getDocMock(...args),
  getDocs: vi.fn(),
  updateDoc: vi.fn(),
  runTransaction: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  collection: vi.fn(),
  Timestamp: { now: () => ({}) },
}));

vi.mock('@/lib/firebase', () => ({ firestore: {} }));

vi.mock('@/features/payments/services/payment-api.service', () => ({
  paymentApiService: { cancelBookingPayment: (...args: unknown[]) => cancelBookingPaymentMock(...args) },
}));

import { bookingRepository } from '../booking.repository';

function bookingSnap(overrides: Record<string, unknown> = {}) {
  return {
    exists: () => true,
    id: 'b1',
    data: () => ({ status: 'pending', customerId: 'cust-1', ...overrides }),
  };
}

describe('bookingRepository.cancelBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. a cancellable (pending) booking routes through POST /api/bookings/cancel, not a direct Firestore write', async () => {
    getDocMock.mockResolvedValueOnce(bookingSnap({ status: 'pending' }));
    cancelBookingPaymentMock.mockResolvedValue({
      success: true,
      data: { success: true, message: 'ok', refund: { status: 'auto_approved', amount: 50000, reason: 'customer_cancelled_before_acceptance' } },
    });

    const result = await bookingRepository.cancelBooking('b1');

    expect(cancelBookingPaymentMock).toHaveBeenCalledWith('b1', undefined);
    expect(result).toEqual({
      success: true,
      refund: { status: 'auto_approved', amount: 50000, reason: 'customer_cancelled_before_acceptance' },
    });
  });

  it('2. an accepted booking is also routed through the backend (review-required case surfaces through untouched)', async () => {
    getDocMock.mockResolvedValueOnce(bookingSnap({ status: 'accepted' }));
    cancelBookingPaymentMock.mockResolvedValue({
      success: true,
      data: { success: true, message: 'ok', refund: { status: 'review_required', amount: 50000, reason: 'customer_cancelled_after_barber_en_route' } },
    });

    const result = await bookingRepository.cancelBooking('b1', 'Berubah pikiran');

    expect(cancelBookingPaymentMock).toHaveBeenCalledWith('b1', 'Berubah pikiran');
    expect(result.refund?.status).toBe('review_required');
  });

  it('3. already-cancelled booking short-circuits locally as success, never calling the backend', async () => {
    getDocMock.mockResolvedValueOnce(bookingSnap({ status: 'cancelled' }));

    const result = await bookingRepository.cancelBooking('b1');

    expect(result).toEqual({ success: true });
    expect(cancelBookingPaymentMock).not.toHaveBeenCalled();
  });

  it('4. an in_progress booking is rejected locally (INVALID_STATUS) without ever calling the backend', async () => {
    getDocMock.mockResolvedValueOnce(bookingSnap({ status: 'in_progress' }));

    const result = await bookingRepository.cancelBooking('b1');

    expect(result.success).toBe(false);
    expect(cancelBookingPaymentMock).not.toHaveBeenCalled();
  });

  it('5. a backend failure is surfaced as a failed result with its error intact', async () => {
    getDocMock.mockResolvedValueOnce(bookingSnap({ status: 'accepted' }));
    cancelBookingPaymentMock.mockResolvedValue({ success: false, error: { code: 'INVALID_BOOKING_STATE', message: 'nope' } });

    const result = await bookingRepository.cancelBooking('b1');

    expect(result).toEqual({ success: false, error: { code: 'INVALID_BOOKING_STATE', message: 'nope' } });
  });

  it('6. a non-existent booking is rejected locally without calling the backend', async () => {
    getDocMock.mockResolvedValueOnce({ exists: () => false });

    const result = await bookingRepository.cancelBooking('missing');

    expect(result.success).toBe(false);
    expect(cancelBookingPaymentMock).not.toHaveBeenCalled();
  });
});
