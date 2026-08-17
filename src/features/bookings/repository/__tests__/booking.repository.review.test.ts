/**
 * Unit Tests for BookingRepository.submitReview
 *
 * Regression guard: submitReview previously wrote reviews/{bookingId} directly
 * to Firestore via setDoc. That path could never update
 * barbers/{barberId}.ratingAverage/reviewCount -- firestore.rules denies a
 * barber's own self-update of those two fields, and a customer has no write
 * access to another user's barbers/{barberId} doc at all -- so the aggregate
 * shown throughout the customer app (search cards, barber detail) was
 * permanently stale at whatever value existed when the barber doc was created.
 * submitReview now delegates to POST /api/bookings/:bookingId/review, which
 * updates both the review doc and the aggregate atomically via the trusted
 * backend (Admin SDK bypasses rules). firestore.rules' `reviews` collection
 * now denies direct client creates outright (`allow create: if false`), so
 * this backend call is the only way a review can be submitted.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { submitBookingReviewMock } = vi.hoisted(() => ({
  submitBookingReviewMock: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  updateDoc: vi.fn(),
  runTransaction: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  collection: vi.fn(),
  Timestamp: { now: () => 'MOCK_TIMESTAMP' },
}));

vi.mock('@/lib/firebase', () => ({ firestore: {} }));

vi.mock('@/features/payments/services/payment-api.service', () => ({
  paymentApiService: { submitBookingReview: (...args: unknown[]) => submitBookingReviewMock(...args) },
}));

import { bookingRepository } from '../booking.repository';

describe('bookingRepository.submitReview', () => {
  beforeEach(() => {
    submitBookingReviewMock.mockReset();
    submitBookingReviewMock.mockResolvedValue({ success: true, data: { success: true, bookingId: 'booking-1', message: 'ok' } });
  });

  it('1. delegates to the backend with the bookingId and rating/reviewText/tags', async () => {
    await bookingRepository.submitReview('booking-1', {
      rating: 5,
      reviewText: 'Mantap',
      tags: ['rapi'],
      customerId: 'real-firebase-uid-123',
      barberId: 'barber-1',
    });

    expect(submitBookingReviewMock).toHaveBeenCalledTimes(1);
    expect(submitBookingReviewMock).toHaveBeenCalledWith('booking-1', {
      rating: 5,
      reviewText: 'Mantap',
      tags: ['rapi'],
    });
  });

  it('2. defaults reviewText/tags when omitted', async () => {
    await bookingRepository.submitReview('booking-1', { rating: 4 });

    expect(submitBookingReviewMock).toHaveBeenCalledWith('booking-1', {
      rating: 4,
      reviewText: '',
      tags: [],
    });
  });

  it('3. surfaces a backend error (e.g. ALREADY_REVIEWED) as a failed result', async () => {
    submitBookingReviewMock.mockResolvedValue({
      success: false,
      error: { code: 'ALREADY_REVIEWED', message: 'Booking ini sudah diberi ulasan.' },
    });

    const result = await bookingRepository.submitReview('booking-1', { rating: 5 });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('ALREADY_REVIEWED');
  });

  it('4. rejects an out-of-range rating before calling the backend', async () => {
    const result = await bookingRepository.submitReview('booking-1', { rating: 6 });

    expect(result.success).toBe(false);
    expect(submitBookingReviewMock).not.toHaveBeenCalled();
  });

  it('5. rejects a missing rating before calling the backend', async () => {
    const result = await bookingRepository.submitReview('booking-1', {});

    expect(result.success).toBe(false);
    expect(submitBookingReviewMock).not.toHaveBeenCalled();
  });
});
