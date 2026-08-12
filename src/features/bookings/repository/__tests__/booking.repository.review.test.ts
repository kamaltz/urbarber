/**
 * Unit Tests for BookingRepository.submitReview (Batch 10B-5H-C)
 *
 * Regression guard: booking/rating/[bookingId].tsx previously submitted every
 * review with a hardcoded MOCK_CUSTOMER_ID = 'CUST001' and no barberId at
 * all. firestore.rules' reviews `allow create` requires
 * request.resource.data.customerId == uid() -- so every real customer's
 * review was permission-denied -- and getBarberReviews queries
 * where('barberId','==',barberId), so even a rule change alone would never
 * have made a review appear in the Barber Reviews screen. These tests lock
 * in that the real customerId/barberId reach the write, and that the
 * deterministic reviews/{bookingId} doc id is used (one review per booking).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { setDocMock, docMock } = vi.hoisted(() => ({
  setDocMock: vi.fn(),
  docMock: vi.fn((_db: unknown, coll: string, id: string) => ({ __coll: coll, __id: id })),
}));

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => docMock(...(args as [unknown, string, string])),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: (...args: unknown[]) => setDocMock(...args),
  updateDoc: vi.fn(),
  runTransaction: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  collection: vi.fn(),
  Timestamp: { now: () => 'MOCK_TIMESTAMP' },
}));

vi.mock('@/lib/firebase', () => ({ firestore: {} }));

import { bookingRepository } from '../booking.repository';

describe('bookingRepository.submitReview', () => {
  beforeEach(() => {
    setDocMock.mockReset();
    docMock.mockClear();
    setDocMock.mockResolvedValue(undefined);
  });

  it('1. writes the real authenticated customerId and the booking barberId, not a mock/missing identity', async () => {
    await bookingRepository.submitReview('booking-1', {
      rating: 5,
      reviewText: 'Mantap',
      tags: ['rapi'],
      customerId: 'real-firebase-uid-123',
      barberId: 'barber-1',
    });

    expect(setDocMock).toHaveBeenCalledTimes(1);
    const [, review] = setDocMock.mock.calls[0];
    expect(review.customerId).toBe('real-firebase-uid-123');
    expect(review.barberId).toBe('barber-1');
    expect(review.bookingId).toBe('booking-1');
  });

  it('2. writes to a deterministic reviews/{bookingId} document id, not a random one', async () => {
    await bookingRepository.submitReview('booking-1', {
      rating: 4,
      customerId: 'cust-1',
      barberId: 'barber-1',
    });

    expect(docMock).toHaveBeenCalledWith(expect.anything(), 'reviews', 'booking-1');
  });

  it('3. rejects a missing customerId before writing (never falls back to a mock identity)', async () => {
    const result = await bookingRepository.submitReview('booking-1', {
      rating: 5,
      barberId: 'barber-1',
    });

    expect(result.success).toBe(false);
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it('4. rejects a missing barberId before writing', async () => {
    const result = await bookingRepository.submitReview('booking-1', {
      rating: 5,
      customerId: 'cust-1',
    });

    expect(result.success).toBe(false);
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it('5. rejects an out-of-range rating before writing', async () => {
    const result = await bookingRepository.submitReview('booking-1', {
      rating: 6,
      customerId: 'cust-1',
      barberId: 'barber-1',
    });

    expect(result.success).toBe(false);
    expect(setDocMock).not.toHaveBeenCalled();
  });
});
